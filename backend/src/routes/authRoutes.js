const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  register, login, adminLogin, getMe, updateProfile, forgotPassword, resetPassword
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { registerRules, loginRules, addressRules, forgotPasswordRules, resetPasswordRules } = require('../middleware/validators');

const router = express.Router();

// Dedicated rate limiters per specification
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again after a few minutes.' }
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many registration attempts. Please try again after 15 minutes.' }
});

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many admin login attempts. Please try again after 15 minutes.' }
});

const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many password reset requests. Please try again later.' }
});

router.post('/register', registerLimiter, registerRules, validate, register);
router.post('/login', loginLimiter, loginRules, validate, login);
router.post('/admin-login', adminLoginLimiter, loginRules, validate, adminLogin);

router.get('/me', protect, getMe);
router.put('/profile', protect, addressRules, validate, updateProfile);
router.post('/forgot-password', resetLimiter, forgotPasswordRules, validate, forgotPassword);
router.post('/reset-password', resetLimiter, resetPasswordRules, validate, resetPassword);

module.exports = router;
