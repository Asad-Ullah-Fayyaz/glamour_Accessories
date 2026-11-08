const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const MetaTrackingConsent = require('../src/models/MetaTrackingConsent');
const {
  recordMetaConsent,
  getMetaConsentStatus,
  hasGrantedMetaConsent
} = require('../src/services/metaConsentService');

function withConsentRecords(callback) {
  const originalFindOneAndUpdate = MetaTrackingConsent.findOneAndUpdate;
  const originalFindOne = MetaTrackingConsent.findOne;
  const records = new Map();

  MetaTrackingConsent.findOneAndUpdate = async (filter, update) => {
    records.set(filter.tokenHash, update.$set);
    return update.$set;
  };
  MetaTrackingConsent.findOne = (filter) => ({
    select: async () => {
      const record = records.get(filter.tokenHash);
      if (!record || record.expiresAt <= filter.expiresAt.$gt) return null;
      return { _id: filter.tokenHash, status: record.status };
    }
  });

  return Promise.resolve()
    .then(() => callback(records))
    .finally(() => {
      MetaTrackingConsent.findOneAndUpdate = originalFindOneAndUpdate;
      MetaTrackingConsent.findOne = originalFindOne;
    });
}

test('server records and verifies an accepted advertising consent choice', async () => {
  await withConsentRecords(async () => {
    const recorded = await recordMetaConsent('granted');

    assert.match(recorded.token, /^[a-f0-9]{64}$/);
    assert.equal(await getMetaConsentStatus(recorded.token), 'granted');
    assert.equal(await hasGrantedMetaConsent(recorded.token), true);
  });
});

test('server records rejected consent and does not authorize CAPI', async () => {
  await withConsentRecords(async () => {
    const recorded = await recordMetaConsent('denied');

    assert.equal(await getMetaConsentStatus(recorded.token), 'denied');
    assert.equal(await hasGrantedMetaConsent(recorded.token), false);
  });
});

test('missing or malformed consent credentials fail closed', async () => {
  await withConsentRecords(async () => {
    assert.equal(await getMetaConsentStatus(undefined), null);
    assert.equal(await getMetaConsentStatus('client-supplied-true'), null);
    assert.equal(await hasGrantedMetaConsent(undefined), false);
  });
});

test('withdrawing consent revokes the existing credential', async () => {
  await withConsentRecords(async () => {
    const accepted = await recordMetaConsent('granted');
    assert.equal(await hasGrantedMetaConsent(accepted.token), true);

    const withdrawn = await recordMetaConsent('denied', accepted.token);
    assert.equal(withdrawn.token, accepted.token);
    assert.equal(await getMetaConsentStatus(accepted.token), 'denied');
    assert.equal(await hasGrantedMetaConsent(accepted.token), false);
  });
});

test('consent records store only a token hash, not the bearer credential', async () => {
  await withConsentRecords(async (records) => {
    const recorded = await recordMetaConsent('granted');
    const tokenHash = crypto.createHash('sha256').update(recorded.token).digest('hex');
    assert.equal(records.has(tokenHash), true);
    assert.equal(records.has(recorded.token), false);
  });
});

test('server replaces an unknown client-selected token with a server-generated credential', async () => {
  await withConsentRecords(async () => {
    const suppliedToken = 'a'.repeat(64);
    const recorded = await recordMetaConsent('granted', suppliedToken);

    assert.notEqual(recorded.token, suppliedToken);
    assert.equal(await getMetaConsentStatus(suppliedToken), null);
    assert.equal(await getMetaConsentStatus(recorded.token), 'granted');
  });
});
