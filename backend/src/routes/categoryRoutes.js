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
const { categoryRules } = require('../middleware/validators');

const router = express.Router();

// Public
router.get('/', getCategories);
router.get('/:slug', getCategoryBySlug);

// Admin (uses generic create/update/delete — level is derived from `parent`)
router.post('/', protect, requireAdmin, categoryRules, validate, createCategory);
router.put('/:id', protect, requireAdmin, categoryRules, validate, updateCategory);
router.delete('/:id', protect, requireAdmin, deleteCategory);

module.exports = router;
