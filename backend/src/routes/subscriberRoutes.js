const express = require('express');
const rateLimit = require('express-rate-limit');
const { subscribe } = require('../controllers/subscriberController');
const { validate } = require('../middleware/validate');
const { subscriberRules } = require('../middleware/validators');

const router = express.Router();

// Strict rate limit: 5 requests / 1 hour per IP
const subscribeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many subscription attempts. Please try again later.' }
});

router.post('/', subscribeLimiter, subscriberRules, validate, subscribe);

module.exports = router;
