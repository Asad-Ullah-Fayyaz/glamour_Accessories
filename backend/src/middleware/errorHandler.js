const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Log full details server-side only
  logger.error(`Unhandled error on ${req.method} ${req.originalUrl}`, {
    name: err.name,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    return res.status(404).json({ success: false, message: 'The requested resource was not found' });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(400).json({
      success: false,
      message: `A record with this ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} already exists`
    });
  }

  // Mongoose validation error — return friendly messages only
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((v) => v.message).join('. ');
    return res.status(400).json({ success: false, message });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid authorization token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Your session has expired. Please sign in again.' });
  }

  // CORS rejection
  if (err.message === 'Not allowed by CORS policy') {
    return res.status(403).json({ success: false, message: 'Origin not permitted' });
  }

  // Generic errors — production NEVER leaks internals (stack, DB details, paths)
  const isDev = process.env.NODE_ENV === 'development';
  res.status(err.statusCode || 500).json({
    success: false,
    message: isDev
      ? (err.message || 'Internal Server Error')
      : 'Something went wrong on our end. Please try again later.'
  });
};

module.exports = errorHandler;
