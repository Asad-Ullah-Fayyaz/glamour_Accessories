const express = require('express');
const {
  updateMetaConsent,
  verifyMetaConsent
} = require('../controllers/metaConsentController');

const router = express.Router();

router.post('/meta', updateMetaConsent);
router.post('/meta/verify', verifyMetaConsent);

module.exports = router;
