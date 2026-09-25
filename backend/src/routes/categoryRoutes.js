const express = require('express');
const {
  getCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');
const { protect, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  categoryRules,
  categoryUpdateRules, // ← add this
} = require('../middleware/validators');

const router = express.Router();

// Public
router.get('/', getCategories);
router.get('/:slug', getCategoryBySlug);

// Admin
router.post('/', protect, requireAdmin, categoryRules, validate, createCategory);
router.put('/:id', protect, requireAdmin, categoryUpdateRules, validate, updateCategory); // ← changed
router.delete('/:id', protect, requireAdmin, deleteCategory);

module.exports = router;