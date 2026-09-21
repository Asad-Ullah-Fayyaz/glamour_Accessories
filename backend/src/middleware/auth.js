const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { config } = require('../config/env');
const logger = require('../utils/logger');

// Protect routes - Verify JWT token
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);

    // ---- Super Admin (env-based, not in DB) ----
    if (decoded.role === 'superadmin' && decoded.id === 'superadmin') {
      req.user = {
        _id: 'superadmin',
        id: 'superadmin',
        name: 'Super Admin',
        email: config.superAdminEmail,
        role: 'superadmin'
      };
      return next();
    }

    // ---- Regular user / admin (DB lookup) ----
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User account no longer exists'
      });
    }

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized token failed or expired'
    });
  }
};

// Optional Auth - attach user if token exists, but don't block request if not
const optionalAuth = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwtSecret);

      // Super Admin — skip DB
      if (decoded.role === 'superadmin' && decoded.id === 'superadmin') {
        req.user = {
          _id: 'superadmin',
          id: 'superadmin',
          name: 'Super Admin',
          email: config.superAdminEmail,
          role: 'superadmin'
        };
      } else {
        req.user = await User.findById(decoded.id).select('-password');
      }
    } catch (err) {
      req.user = null;
    }
  }
  next();
};

// Require Admin Role — accepts both 'admin' and 'superadmin'
const requireAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
    return next();
  }
  logger.warn('Admin access denied', {
    path: req.originalUrl,
    userId: req.user && req.user._id
  });
  return res.status(403).json({
    success: false,
    message: 'Forbidden: Access restricted to administrative personnel only'
  });
};

// Require Super Admin Role — strictly 'superadmin'
const requireSuperAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'superadmin') {
    return next();
  }
  logger.warn('Super Admin access denied', {
    path: req.originalUrl,
    userId: req.user && req.user._id,
    role: req.user && req.user.role
  });
  return res.status(403).json({
    success: false,
    message: 'Forbidden: Access restricted to Super Admin only'
  });
};

module.exports = { protect, optionalAuth, requireAdmin, requireSuperAdmin };