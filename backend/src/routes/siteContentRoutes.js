const express = require('express');
const router = express.Router();
const {
  getHomepageContent,
  updateHomepageContent
} = require('../controllers/siteContentController');
const { protect, requireAdmin } = require('../middleware/auth');
const uploadHeroMedia = require('../middleware/uploadHeroMedia');

// Public read — the frontend calls this on every page load
router.get('/homepage', getHomepageContent);

// Admin update — the "Save Changes" button calls this
router.put('/homepage', protect, requireAdmin, updateHomepageContent);

// Admin media upload — accepts images AND videos
// (uses the hero-specific multer instance, not the shared image-only one)
router.post(
  '/homepage/upload',
  protect,
  requireAdmin,
  uploadHeroMedia.single('image'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const url = req.file.path;
    res.status(200).json({ success: true, url });
  }
);

module.exports = router;