const express = require('express');
const router = express.Router();
const {
  getHomepageContent,
  updateHomepageContent
} = require('../controllers/siteContentController');
const { protect, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public read
router.get('/homepage', getHomepageContent);

// Admin update
router.put('/homepage', protect, requireAdmin, updateHomepageContent);

// Admin image upload (reuses existing product upload middleware)
router.post(
  '/homepage/upload',
  protect,
  requireAdmin,
  upload.single('image'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // multer.diskStorage puts the file in `backend/uploads/`
    // req.file.filename is the generated name.
        // Cloudinary returns the full HTTPS URL in req.file.path
    const url = req.file.path;

    res.status(200).json({ success: true, url });
  }
);

module.exports = router;