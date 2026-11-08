const crypto = require('crypto');
const net = require('net');
const axios = require('axios');
const logger = require('../utils/logger');
const { config } = require('../config/env');
const Order = require('../models/Order');
const { hasGrantedMetaConsent } = require('./metaConsentService');

const MAX_PURCHASE_ATTEMPTS = 5;
const MAX_ATTEMPTS_PER_DISPATCH = MAX_PURCHASE_ATTEMPTS;
const PROCESSING_LEASE_MS = 45_000;
const RETRY_DELAY_BASE_MS = 500;
const RETRY_DELAY_MAX_MS = 8_000;

/**
 * Helper to SHA-256 hash string values for Meta CAPI compliance.
 * Meta requires lowercase, trimmed strings before hashing.
 */
function hashValue(val) {
  if (!val || typeof val !== 'string') return undefined;
  const normalized = val.trim().toLowerCase();
  if (!normalized) return undefined;
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Normalize phone number for Meta CAPI (digits only, e.g., 923001234567 or 03001234567).
 * Meta expects digits only for phone hashing.
 */
function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return undefined;
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('03') && cleaned.length === 11) {
    cleaned = '92' + cleaned.slice(1);
  }
  return cleaned ? hashValue(cleaned) : undefined;
}

/**
 * Use Express's client IP after its configured proxy trust chain is applied.
 * Do not read forwarding headers directly: clients can supply spoofed values.
 */
function getTrustedClientIp(req) {
  const clientIp = req?.ip;
  if (typeof clientIp !== 'string' || !clientIp || !net.isIP(clientIp)) return '';

  const lowerCaseIp = clientIp.toLowerCase();
  const normalized = lowerCaseIp.startsWith('::ffff:')
    ? lowerCaseIp.replace(/^::ffff:/, '')
    : lowerCaseIp;

  if (
    normalized === '::1' ||
    normalized === '::' ||
    normalized === '0.0.0.0' ||
    normalized === '127.0.0.1' ||
    normalized.startsWith('0.') ||
    normalized.startsWith('10.') ||
    /^192\.168\./.test(normalized) ||
    /^169\.254\./.test(normalized) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(normalized) ||
    /^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\./.test(normalized) ||
    /^192\.0\.2\./.test(normalized) ||
    /^198\.51\.100\./.test(normalized) ||
    /^203\.0\.113\./.test(normalized) ||
    /^22[4-9]\./.test(normalized) ||
    /^23[0-9]\./.test(normalized) ||
    /^24[0-9]\./.test(normalized) ||
    /^25[0-5]\./.test(normalized) ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith('ff') ||
    normalized.startsWith('2001:db8:')
  ) {
    return '';
  }

  return normalized;
}

function buildPurchaseCustomData(order) {
  const value = order?.totalAmount;
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    !Array.isArray(order?.items)
  ) {
    return null;
  }

  const contents = [];
  for (const item of order.items) {
    const productId = item?.product || item?._id;
    const quantity = item?.quantity;
    const price = item?.price;
    const lensOption = item?.customization?.lensOption;
    const lensPrice = lensOption ? lensOption.price : 0;

    if (
      !productId ||
      typeof quantity !== 'number' ||
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      typeof price !== 'number' ||
      !Number.isFinite(price) ||
      price < 0 ||
      typeof lensPrice !== 'number' ||
      !Number.isFinite(lensPrice) ||
      lensPrice < 0
    ) {
      return null;
    }

    contents.push({
      id: String(productId),
      quantity,
      item_price: price + lensPrice
    });
  }

  if (contents.length === 0) return null;

  return {
    value,
    currency: 'PKR',
    content_ids: contents.map((item) => item.id),
    contents,
    content_type: 'product',
    num_items: contents.reduce((sum, item) => sum + item.quantity, 0),
    order_id: order.orderId
  };
}

function getRetryDelay(attempt) {
  return Math.min(
    RETRY_DELAY_BASE_MS * (2 ** Math.max(0, attempt - 1)),
    RETRY_DELAY_MAX_MS
  );
}

function isAcceptedResponse(response) {
  return (
    response?.status >= 200 &&
    response.status < 300 &&
    Number.isInteger(response.data?.events_received) &&
    response.data.events_received > 0 &&
    (!Array.isArray(response.data.errors) || response.data.errors.length === 0)
  );
}

function isRetryableFailure(error, response) {
  const status = response?.status || error?.response?.status;
  return (
    !status ||
    (status >= 200 && status < 300) ||
    status === 408 ||
    status === 429 ||
    status >= 500
  );
}

async function claimPurchaseDispatch(orderId, claimToken) {
  const now = new Date();
  const leaseExpiredBefore = new Date(now.getTime() - PROCESSING_LEASE_MS);

  return Order.findOneAndUpdate(
    {
      orderId,
      $and: [
        {
          $or: [
            { metaPurchaseStatus: { $exists: false } },
            {
              metaPurchaseStatus: 'failed',
              metaPurchaseNextAttemptAt: { $lte: now }
            },
            {
              metaPurchaseStatus: 'processing',
              metaPurchaseLockedAt: { $lte: leaseExpiredBefore }
            }
          ]
        },
        {
          $or: [
            { metaPurchaseAttempts: { $exists: false } },
            { metaPurchaseAttempts: { $lt: MAX_PURCHASE_ATTEMPTS } }
          ]
        }
      ]
    },
    {
      $set: {
        metaPurchaseStatus: 'processing',
        metaPurchaseLockedAt: now,
        metaPurchaseClaimToken: claimToken,
        metaPurchaseNextAttemptAt: null,
        metaPurchaseLastError: null
      },
      $inc: { metaPurchaseAttempts: 1 }
    },
    { new: true }
  );
}

async function updatePurchaseDispatch(orderId, claimToken, update) {
  return Order.updateOne(
    {
      orderId,
      metaPurchaseStatus: 'processing',
      metaPurchaseClaimToken: claimToken
    },
    update
  );
}

/**
 * Send a Purchase event to Meta Conversions API (CAPI).
 * The order document provides a lease-based atomic claim and bounded retries.
 */
async function sendCapiPurchaseEvent({
  order,
  req,
  fbp,
  fbc,
  consentToken
}) {
  try {
    if (!(await hasGrantedMetaConsent(consentToken))) {
      logger.dev('[Meta CAPI] Skipped: advertising tracking consent not granted.');
      return;
    }

    const datasetId = (
      process.env.META_DATASET_ID ||
      process.env.META_PIXEL_ID ||
      ''
    ).trim();
    const accessToken = process.env.META_ACCESS_TOKEN;

    if (!accessToken) {
      logger.dev('[Meta CAPI] Skipped: META_ACCESS_TOKEN not set in environment.');
      return;
    }

    if (!/^\d+$/.test(datasetId)) {
      logger.error('[Meta CAPI] Skipped: Set a valid META_DATASET_ID in the server environment.');
      return;
    }

    if (!process.env.META_DATASET_ID && process.env.META_PIXEL_ID) {
      logger.warn('[Meta CAPI] Using legacy META_PIXEL_ID; configure META_DATASET_ID explicitly.');
    }

    const customData = buildPurchaseCustomData(order);
    if (!customData) {
      logger.error('[Meta CAPI] Skipped: order has missing or invalid Purchase data.', {
        orderId: order?.orderId
      });
      return;
    }

    if (!order?.orderId) {
      logger.error('[Meta CAPI] Skipped: order ID is required for idempotency.');
      return;
    }

    const claimToken = crypto.randomUUID();
    let claimedOrder = await claimPurchaseDispatch(order.orderId, claimToken);
    if (!claimedOrder) {
      logger.dev('[Meta CAPI] Purchase dispatch skipped: order is already processing, succeeded, or not retryable.', {
        orderId: order.orderId
      });
      return;
    }

    const clientIp = getTrustedClientIp(req);

    const userAgent = req?.headers['user-agent'] || '';

    const email = order.customerEmail || order.shippingAddress?.email || '';
    const phone = order.shippingAddress?.phone || '';

    const userData = {
      em: email ? [hashValue(email)] : undefined,
      ph: phone ? [normalizePhone(phone)] : undefined,
      client_ip_address: clientIp || undefined,
      client_user_agent: userAgent,
      fbp: fbp || req?.cookies?._fbp || undefined,
      fbc: fbc || req?.cookies?._fbc || undefined
    };

    // Remove undefined fields
    Object.keys(userData).forEach((key) => {
      if (
        userData[key] === undefined ||
        (Array.isArray(userData[key]) && userData[key].some((value) => !value))
      ) {
        delete userData[key];
      }
    });

    const orderConfirmationUrl = `${config.frontendUrl}/order-confirmation?orderId=${encodeURIComponent(order.orderId)}`;

    const eventPayload = {
      data: [
        {
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          event_id: order.orderId,
          event_source_url: orderConfirmationUrl,
          action_source: 'website',
          user_data: userData,
          custom_data: customData
        }
      ]
    };

    const url = `https://graph.facebook.com/v19.0/${datasetId}/events?access_token=${accessToken}`;

    for (let dispatchAttempt = 0; dispatchAttempt < MAX_ATTEMPTS_PER_DISPATCH; dispatchAttempt += 1) {
      if (!(await hasGrantedMetaConsent(consentToken))) {
        await updatePurchaseDispatch(order.orderId, claimToken, {
          $set: {
            metaPurchaseStatus: 'failed',
            metaPurchaseLockedAt: null,
            metaPurchaseClaimToken: null,
            metaPurchaseNextAttemptAt: null,
            metaPurchaseLastError: 'CONSENT_NOT_GRANTED'
          }
        });
        logger.dev('[Meta CAPI] Purchase dispatch stopped because consent is no longer granted.', {
          orderId: order.orderId
        });
        return;
      }

      let response;
      let dispatchError;

      try {
        response = await axios.post(url, eventPayload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000
        });
      } catch (error) {
        dispatchError = error;
      }

      if (isAcceptedResponse(response)) {
        await updatePurchaseDispatch(order.orderId, claimToken, {
          $set: {
            metaPurchaseStatus: 'succeeded',
            metaPurchaseLockedAt: null,
            metaPurchaseClaimToken: null,
            metaPurchaseNextAttemptAt: null,
            metaPurchaseLastError: null,
            metaPurchaseAcceptedAt: new Date()
          }
        });

        logger.info(`[Meta CAPI] Purchase event accepted for order ${order.orderId}`, {
          status: response.status,
          events_received: response.data.events_received
        });
        return;
      }

      const currentAttempt = claimedOrder.metaPurchaseAttempts;
      const retryable = isRetryableFailure(dispatchError, response);
      const retryAvailable =
        retryable && currentAttempt < MAX_PURCHASE_ATTEMPTS;
      const retryNow =
        retryAvailable && dispatchAttempt + 1 < MAX_ATTEMPTS_PER_DISPATCH;
      const nextAttemptAt = retryAvailable
        ? new Date(Date.now() + getRetryDelay(currentAttempt))
        : null;
      const failureCode =
        dispatchError?.code ||
        (response?.status ? `HTTP_${response.status}` : 'UNCONFIRMED_RESPONSE');

      await updatePurchaseDispatch(order.orderId, claimToken, {
        $set: {
          metaPurchaseStatus: 'failed',
          metaPurchaseLockedAt: null,
          metaPurchaseClaimToken: null,
          metaPurchaseNextAttemptAt: nextAttemptAt,
          metaPurchaseLastError: String(failureCode).slice(0, 120)
        }
      });

      logger.error(`[Meta CAPI] Purchase event not confirmed for order ${order.orderId}`, {
        status: response?.status || dispatchError?.response?.status,
        code: dispatchError?.code,
        retryScheduled: Boolean(nextAttemptAt)
      });

      if (!retryNow) return;

      await new Promise((resolve) => setTimeout(resolve, getRetryDelay(currentAttempt)));
      claimedOrder = await claimPurchaseDispatch(order.orderId, claimToken);
      if (!claimedOrder) return;
    }
  } catch (err) {
    logger.error(`[Meta CAPI] Error sending Purchase event for order ${order?.orderId}:`, {
      status: err.response?.status,
      code: err.code
    });
  }
}

module.exports = {
  sendCapiPurchaseEvent,
  getTrustedClientIp,
  hashValue,
  normalizePhone,
  buildPurchaseCustomData
};
