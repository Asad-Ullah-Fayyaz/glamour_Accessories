const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { config } = require('../config/env');

// Cloudinary is already configured by upload.js, but config() is idempotent
// so calling it again here is safe and makes this file self-contained.
cloudinary.config({
  cloud_name: config.cloudinaryCloudName,
  api_key: config.cloudinaryApiKey,
  api_secret: config.cloudinaryApiSecret,
  secure: true
});

// Hero media storage — accepts BOTH images and videos.
// Key differences from the product upload storage:
//   - resource_type: 'auto'   → Cloudinary detects video vs image itself
//   - no allowed_formats       → Cloudinary accepts mp4/webm/mov natively
//   - no transformation        → transformations would corrupt video
const heroStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isVideo = (file.mimetype || '').startsWith('video/');

    return {
      folder: 'axi/hero',
      resource_type: 'auto',          // let Cloudinary decide image vs video
      // Image-only transformation — skip for video
      ...(isVideo
        ? {}
        : {
            transformation: [
              { width: 1920, height: 1920, crop: 'limit' },
              { quality: 'auto:good', fetch_format: 'auto' }
            ]
          }),
      public_id: `axi-hero-${Date.now()}-${Math.round(Math.random() * 1e9)}`
    };
  }
});

// Accept images AND videos. Reject everything else.
function checkHeroFileType(file, cb) {
  const allowedImage = /jpeg|jpg|png|webp/;
  const allowedVideo = /mp4|webm|mov|quicktime/;

  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const mime = (file.mimetype || '').toLowerCase();

  const isImageExt = allowedImage.test(ext);
  const isVideoExt = allowedVideo.test(ext);
  const isImageMime = mime.startsWith('image/');
  const isVideoMime = mime.startsWith('video/');

  if ((isImageExt || isVideoExt) && (isImageMime || isVideoMime)) {
    return cb(null, true);
  }

  cb(
    new Error(
      'Unsupported file type. Hero media accepts JPG, PNG, WEBP, MP4, WEBM, MOV.'
    )
  );
}

const uploadHeroMedia = multer({
  storage: heroStorage,
  limits: { fileSize: 50 * 1024 * 1024 },   // 50 MB — enough for a short hero video
  fileFilter(req, file, cb) {
    checkHeroFileType(file, cb);
  }
});

module.exports = uploadHeroMedia;