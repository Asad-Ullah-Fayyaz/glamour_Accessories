const express = require('express');
const {
  getCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  createSubCategory,
  updateSubCategory
} = require('../controllers/categoryController');
const { protect, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', getCategories);
router.get('/:slug', getCategoryBySlug);

// Admin Category Routes
router.post('/', protect, requireAdmin, createCategory);
router.put('/:id', protect, requireAdmin, updateCategory);
router.post('/subcategory', protect, requireAdmin, createSubCategory);
router.put('/subcategory/:id', protect, requireAdmin, updateSubCategory);

module.exports = router;
