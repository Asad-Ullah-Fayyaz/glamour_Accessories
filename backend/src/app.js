const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const path = require('path');
const mongoose = require('mongoose');

const { config } = require('./config/env');
const { SHIPPING } = require('./config/constants');
const logger = require('./utils/logger');

const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const siteContentRoutes = require('./routes/siteContentRoutes');
const subscriberRoutes = require('./routes/subscriberRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Behind a single reverse proxy (nginx / Cloudflare / Render / Railway / Heroku).
// If you have two hops (Cloudflare -> nginx -> Node), change to 2 or 'loopback'.
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// Compression (place before routes)
app.use(compression());

// CORS — strict origin allow-list
const allowedOrigins = config.allowedOrigins;
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else if (config.isDevelopment) {
        logger.warn('CORS request from unconfigured origin (allowed in dev)', { origin });
        callback(null, true);
      } else {
        logger.warn('CORS request blocked', { origin });
        callback(new Error('Not allowed by CORS policy'));
      }
    },
    credentials: true
  })
);

// ============================================================
// Rate limiting — tiered by route sensitivity.
//
// The app is an SPA. Redux dispatches many GETs on mount
// (categories, products, cart, site-content) and React
// StrictMode double-fires effects in dev. A single flat limiter
// of 300/15min locks legitimate users out. The fix is to split
// limits by risk so reads stay generous and writes/auth are
// tight.
//
// The limiter is always active — no NODE_ENV skip — so behaviour
// is identical in dev and prod. In dev only, we additionally
// skip localhost so Redux double-fires don't lock you out on
// your own machine.
// ============================================================

const baseRateLimitOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down and try again in a few minutes.'
  }
};

const isLocalhost = (req) => {
  const ip = req.ip || '';
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
};

const skipLocalhostInDev = (req) =>
  process.env.NODE_ENV !== 'production' && isLocalhost(req);

// Tier 1 — Public read-only GETs (products, categories, site-content, reviews)
const publicReadLimiter = rateLimit({
  ...baseRateLimitOptions,
  windowMs: 15 * 60 * 1000,
  max: 1000,
  skip: skipLocalhostInDev
});

// Tier 2 — Authed reads (cart, my-orders, profile)
const authedReadLimiter = rateLimit({
  ...baseRateLimitOptions,
  windowMs: 15 * 60 * 1000,
  max: 600,
  skip: skipLocalhostInDev
});

// Tier 3 — Cart writes (add / update / remove / clear / merge)
const cartWriteLimiter = rateLimit({
  ...baseRateLimitOptions,
  windowMs: 15 * 60 * 1000,
  max: 200,
  skip: skipLocalhostInDev
});

// Tier 4 — Order creation
const orderCreateLimiter = rateLimit({
  ...baseRateLimitOptions,
  windowMs: 15 * 60 * 1000,
  max: 60,
  skip: skipLocalhostInDev
});

// Tier 5 — Auth (brute-force sensitive)
// skipSuccessfulRequests means successful logins don't consume the quota;
// only failed attempts count.
const authLimiter = rateLimit({
  ...baseRateLimitOptions,
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  skip: skipLocalhostInDev
});

// Tier 6 — Global fallback for anything not covered above
const globalLimiter = rateLimit({
  ...baseRateLimitOptions,
  windowMs: 15 * 60 * 1000,
  max: 400,
  skip: skipLocalhostInDev
});

// --- Mount in order: most specific first, fallback last ---

// Auth — tightest, applied to the exact login/register paths only
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/admin-login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Orders — POST gets the tight limiter; everything else is authed reads
app.use('/api/orders', (req, res, next) => {
  if (req.method === 'POST') return orderCreateLimiter(req, res, next);
  return authedReadLimiter(req, res, next);
});

// Cart — writes are limited, reads are authed-read limited
app.use('/api/cart', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return cartWriteLimiter(req, res, next);
  }
  return authedReadLimiter(req, res, next);
});

// Public read-heavy routes
app.use('/api/products', publicReadLimiter);
app.use('/api/categories', publicReadLimiter);
app.use('/api/site-content', publicReadLimiter);
app.use('/api/reviews', publicReadLimiter);
app.use('/api/config', publicReadLimiter);

// Fallback for anything not covered above
app.use('/api', globalLimiter);

// Request Logging
if (config.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      skip: (req, res) => res.statusCode < 400,
      stream: { write: (msg) => logger.warn(msg.trim()) }
    })
  );
}

// Body Parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Static Uploads — cache aggressively (filenames are unique per upload)
app.use(
  '/uploads',
  express.static(path.join(__dirname, '../uploads'), {
    maxAge: '30d',
    immutable: true,
    etag: true
  })
);

// Health — shallow (liveness)
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Health — deep (readiness, verifies DB)
app.get('/api/health/deep', (req, res) => {
  const dbState = mongoose.connection.readyState; // 1 = connected
  if (dbState === 1) {
    res.status(200).json({ status: 'ok', db: 'connected' });
  } else {
    res.status(503).json({ status: 'degraded', db: 'disconnected' });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/site-content', siteContentRoutes);
app.use('/api/subscribers', subscriberRoutes);
app.use('/api/reviews', reviewRoutes);

// Shipping config (public, cached for 1 hour)
app.get('/api/config/shipping', (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  res.json({ success: true, shipping: SHIPPING });
});

// 404 catch-all (Express 4 + 5 compatible)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found`
  });
});

// Centralized error handler (must be last)
app.use(errorHandler);

module.exports = app;