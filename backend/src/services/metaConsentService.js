const crypto = require('crypto');
const MetaTrackingConsent = require('../models/MetaTrackingConsent');

const CONSENT_TOKEN_PATTERN = /^[a-f0-9]{64}$/i;
const CONSENT_RETENTION_MS = 180 * 24 * 60 * 60 * 1000;

function hashConsentToken(token) {
  if (typeof token !== 'string' || !CONSENT_TOKEN_PATTERN.test(token)) return null;
  return crypto.createHash('sha256').update(token.toLowerCase()).digest('hex');
}

async function recordMetaConsent(status, existingToken) {
  if (status !== 'granted' && status !== 'denied') {
    throw new TypeError('Consent status must be granted or denied.');
  }

  const now = new Date();
  const existingHash = hashConsentToken(existingToken);
  const existingRecord = existingHash
    ? await MetaTrackingConsent.findOne({
        tokenHash: existingHash,
        expiresAt: { $gt: now }
      }).select('_id')
    : null;
  const token = existingRecord
    ? existingToken.toLowerCase()
    : crypto.randomBytes(32).toString('hex');
  const tokenHash = hashConsentToken(token);
  const expiresAt = new Date(now.getTime() + CONSENT_RETENTION_MS);

  await MetaTrackingConsent.findOneAndUpdate(
    { tokenHash },
    { $set: { status, expiresAt } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return { status, token };
}

async function getMetaConsentStatus(token) {
  const tokenHash = hashConsentToken(token);
  if (!tokenHash) return null;

  const record = await MetaTrackingConsent.findOne({
    tokenHash,
    expiresAt: { $gt: new Date() }
  }).select('status');

  return record?.status || null;
}

async function hasGrantedMetaConsent(token) {
  return (await getMetaConsentStatus(token)) === 'granted';
}

module.exports = {
  recordMetaConsent,
  getMetaConsentStatus,
  hasGrantedMetaConsent
};
