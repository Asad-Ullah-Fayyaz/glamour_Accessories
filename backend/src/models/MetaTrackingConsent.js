const mongoose = require('mongoose');

const metaTrackingConsentSchema = new mongoose.Schema({
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    select: false
  },
  status: {
    type: String,
    enum: ['granted', 'denied'],
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    expires: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('MetaTrackingConsent', metaTrackingConsentSchema);
