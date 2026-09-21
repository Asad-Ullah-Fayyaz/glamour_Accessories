const express = require('express');
const {
  createProductReview,
  getProductReviews,
  getUserProductReview,
  getHomepageReviews,
  updateReview,
  deleteReview
} = require('../controllers/reviewController');

const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createReviewRules, updateReviewRules } = require('../middleware/validators');

const router = express.Router();

// Public routes
router.get('/homepage', getHomepageReviews);
router.get('/products/:productId', getProductReviews);

// Protected routes (Customer)
router.get('/products/:productId/me', protect, getUserProductReview);
router.post('/products/:productId', protect, createReviewRules, validate, createProductReview);
router.put('/:id', protect, updateReviewRules, validate, updateReview);
router.delete('/:id', protect, deleteReview);

module.exports = router;
