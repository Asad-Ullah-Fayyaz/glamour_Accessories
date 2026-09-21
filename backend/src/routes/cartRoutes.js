const express = require('express');
const {
  getCart,
  addItem,
  updateQuantity,
  removeItem,
  clearCart,
  mergeCart,
  uploadPrescription
} = require('../controllers/cartController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { quantityRule } = require('../middleware/validators');
const upload = require('../middleware/upload');

const router = express.Router();

// Reject the Super Admin identity from all cart operations.
const rejectSuperAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'The Super Admin account cannot use the shopping cart. Sign in as a customer to shop.'
    });
  }
  next();
};

// ============================================================
// PUBLIC ROUTE — prescription upload
// Must be registered BEFORE the protect middleware below,
// because guests (not logged in) also need to upload.
// ============================================================
router.post(
  '/prescription-upload',
  upload.single('image'),
  uploadPrescription
);

// ============================================================
// All other cart routes require authentication + reject Super Admin
// ============================================================
router.use(protect, rejectSuperAdmin);

router.get('/', getCart);
router.post('/add', quantityRule('quantity', { required: false }), validate, addItem);
router.post('/merge', validate, mergeCart);
router.put('/update', quantityRule(), validate, updateQuantity);
// The URL param is now the cart line's unique _id (lineId), not the productId.
// The name is cosmetic — Express doesn't care what you call it — but it makes
// the intent clear: we delete one specific line, not all lines of a product.
router.delete('/item/:lineId', removeItem);
router.delete('/clear', clearCart);

module.exports = router;