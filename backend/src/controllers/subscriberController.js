const Subscriber = require('../models/Subscriber');
const logger = require('../utils/logger');

// @desc    Subscribe to email newsletter
// @route   POST /api/subscribers
// @access  Public
exports.subscribe = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if already subscribed — return identical success message to prevent email enumeration
    const existing = await Subscriber.findOne({ email: normalizedEmail });
    if (!existing) {
      await Subscriber.create({ email: normalizedEmail });
      logger.info('New newsletter subscriber registered', { email: normalizedEmail });
    }

    res.status(200).json({
      success: true,
      message: 'Thank you for subscribing to the AXI Collection private list.'
    });
  } catch (error) {
    next(error);
  }
};
