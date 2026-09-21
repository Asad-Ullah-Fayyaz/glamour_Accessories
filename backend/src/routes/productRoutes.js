const express = require('express');
const {
  getProducts,
  getFeaturedProducts,
  getProductById,
  getProductBySlug,
  getRelatedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadImages
} = require('../controllers/productController');
const { protect, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { paginationRules, createProductRules, productRules } = require('../middleware/validators');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/', paginationRules, validate, getProducts);
router.get('/id/:id', getProductById);
router.get('/featured', getFeaturedProducts);
router.get('/:slug', getProductBySlug);
router.get('/:id/related', getRelatedProducts);

// Admin Routes
router.post('/', protect, requireAdmin, createProductRules, validate, createProduct);
router.put('/:id', protect, requireAdmin, productRules, validate, updateProduct);
router.delete('/:id', protect, requireAdmin, deleteProduct);
router.post('/upload', protect, requireAdmin, upload.array('images', 5), uploadImages);

module.exports = router;
