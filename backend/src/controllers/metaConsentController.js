const {
  recordMetaConsent,
  getMetaConsentStatus
} = require('../services/metaConsentService');

async function updateMetaConsent(req, res, next) {
  try {
    const { consent, token } = req.body || {};
    if (consent !== 'granted' && consent !== 'denied') {
      return res.status(400).json({
        success: false,
        message: 'A granted or denied advertising tracking choice is required.'
      });
    }

    const result = await recordMetaConsent(consent, token);
    return res.status(200).json({
      success: true,
      consent: result.status,
      token: result.token
    });
  } catch (error) {
    return next(error);
  }
}

async function verifyMetaConsent(req, res, next) {
  try {
    const consent = await getMetaConsentStatus(req.body?.token);
    return res.status(200).json({ success: true, consent });
  } catch (error) {
    return next(error);
  }
}

module.exports = { updateMetaConsent, verifyMetaConsent };
