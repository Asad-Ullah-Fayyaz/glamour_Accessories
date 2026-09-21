const express = require('express');
const {
  createOrder,
  getMyOrders,
  getOrderByOrderId,
  trackOrderPublic
} = require('../controllers/orderController');
const { protect, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createOrderRules } = require('../middleware/validators');

const router = express.Router();

// Public route for order tracking
router.post('/track', trackOrderPublic);

// Guest & Customer order creation (optionalAuth attaches user if logged in, but allows guests)
router.post('/', optionalAuth, createOrderRules, validate, createOrder);

// Protected customer routes
router.use(protect);
router.get('/my-orders', getMyOrders);
router.get('/:orderId', getOrderByOrderId);

module.exports = router;