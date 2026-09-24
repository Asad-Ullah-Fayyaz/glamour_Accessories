const express = require('express');
const {
  getDashboardStats,
  getAllOrders,
  updateOrderStatus,
  assignTrackingId,
  getCustomers,
  getAdminProducts,
  getProductCountsByCategory,
  getAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin
} = require('../controllers/adminController');
const {
  getAdminCategories,
  toggleCategoryStatus,
  deleteCategory
} = require('../controllers/categoryController');
const {
  getAdminReviews,
  updateReviewStatus,
  deleteReview: adminDeleteReview
} = require('../controllers/reviewController');
const { protect, requireAdmin, requireSuperAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { trackingRules } = require('../middleware/validators');

const router = express.Router();

router.use(protect);
router.use(requireAdmin);

router.get('/dashboard', getDashboardStats);
router.get('/orders', getAllOrders);
router.put('/orders/:id/status', updateOrderStatus);
router.post('/orders/:id/tracking', trackingRules, validate, assignTrackingId);
router.get('/customers', getCustomers);
router.get('/products/counts', getProductCountsByCategory);
router.get('/products', getAdminProducts);
router.get('/categories', getAdminCategories);
router.put('/categories/:id/toggle', toggleCategoryStatus);
router.delete('/categories/:id', deleteCategory);

// Review management — Admin
router.get('/reviews', getAdminReviews);
router.put('/reviews/:id/status', updateReviewStatus);
router.delete('/reviews/:id', adminDeleteReview);

// Admin management — Super Admin only
router.get('/admins', requireSuperAdmin, getAdmins);
router.post('/admins', requireSuperAdmin, createAdmin);
router.put('/admins/:id', requireSuperAdmin, updateAdmin);
router.delete('/admins/:id', requireSuperAdmin, deleteAdmin);

module.exports = router;
