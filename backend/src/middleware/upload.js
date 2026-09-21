const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { config } = require('../config/env');

// Configure Cloudinary SDK with credentials from env.
// These are never exposed to the frontend.
cloudinary.config({
  cloud_name: config.cloudinaryCloudName,
  api_key: config.cloudinaryApiKey,
  api_secret: config.cloudinaryApiSecret,
  secure: true
});

// Cloudinary storage adapter for Multer.
// Every uploaded file goes to Cloudinary and is returned as a permanent HTTPS URL.
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    // Route different uploads into different folders for organization.
    // Prescription uploads (from cart) → axi/prescriptions
    // Homepage uploads (from site-content) → axi/homepage
    // Everything else (products) → axi/products
    let folder = 'axi/products';
    if (req.baseUrl && req.baseUrl.includes('site-content')) {
      folder = 'axi/homepage';
    } else if (req.baseUrl && req.baseUrl.includes('cart')) {
      folder = 'axi/prescriptions';
    }

    return {
      folder,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      // Auto-optimize: limit to 1920px on longest side, convert to WebP, decent quality
      transformation: [
        { width: 1920, height: 1920, crop: 'limit' },
        { quality: 'auto:good', fetch_format: 'auto' }
      ],
      // Unique filename so files never overwrite each other
      public_id: `axi-${Date.now()}-${Math.round(Math.random() * 1e9)}`
    };
  }
});

// File type check — rejects anything that isn't a supported image
function checkFileType(file, cb) {
  const filetypes = /jpeg|jpg|png|webp/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error('Images only! Allowed formats: JPEG, JPG, PNG, WEBP.'));
}

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
  fileFilter(req, file, cb) {
    checkFileType(file, cb);
  }
});

module.exports = upload;