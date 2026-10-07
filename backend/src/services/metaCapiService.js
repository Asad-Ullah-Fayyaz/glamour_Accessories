const crypto = require('crypto');
const axios = require('axios');
const logger = require('../utils/logger');
const { config } = require('../config/env');

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
 * Send a Purchase event to Meta Conversions API (CAPI).
 * Non-blocking operation — fails gracefully without interrupting order creation.
 */
async function sendCapiPurchaseEvent({
  order,
  req,
  fbp,
  fbc
}) {
  try {
    const datasetId = process.env.META_DATASET_ID || process.env.META_PIXEL_ID || '1129224573100133';
    const accessToken = process.env.META_ACCESS_TOKEN;

    if (!accessToken) {
      logger.dev('[Meta CAPI] Skipped: META_ACCESS_TOKEN not set in environment.');
      return;
    }

    const clientIp =
      req?.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req?.ip ||
      req?.socket?.remoteAddress ||
      '';

    const userAgent = req?.headers['user-agent'] || '';

    // Extract user data
    const email = order.customerEmail || order.shippingAddress?.email || '';
    const phone = order.shippingAddress?.phone || '';
    const fullName = order.shippingAddress?.fullName || '';
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    const city = order.shippingAddress?.city || '';
    const state = order.shippingAddress?.state || '';
    const postalCode = order.shippingAddress?.postalCode || '';
    const country = order.shippingAddress?.country || 'Pakistan';

    const userData = {
      em: email ? [hashValue(email)] : undefined,
      ph: phone ? [normalizePhone(phone)] : undefined,
      fn: firstName ? [hashValue(firstName)] : undefined,
      ln: lastName ? [hashValue(lastName)] : undefined,
      ct: city ? [hashValue(city)] : undefined,
      st: state ? [hashValue(state)] : undefined,
      zp: postalCode ? [hashValue(postalCode)] : undefined,
      country: country ? [hashValue(country === 'Pakistan' ? 'pk' : country)] : undefined,
      client_ip_address: clientIp,
      client_user_agent: userAgent,
      fbp: fbp || req?.cookies?._fbp || undefined,
      fbc: fbc || req?.cookies?._fbc || undefined
    };

    // Remove undefined fields
    Object.keys(userData).forEach((key) => {
      if (userData[key] === undefined) delete userData[key];
    });

    const items = Array.isArray(order.items) ? order.items : [];
    const contentIds = items.map((it) => String(it.product || it._id || ''));
    const totalQty = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);

    const eventPayload = {
      data: [
        {
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          event_id: order.orderId,
          event_source_url: `${config.frontendUrl}/checkout`,
          action_source: 'website',
          user_data: userData,
          custom_data: {
            value: Number(order.totalAmount) || 0,
            currency: 'PKR',
            content_ids: contentIds,
            content_type: 'product',
            num_items: totalQty,
            order_id: order.orderId
          }
        }
      ]
    };

    const url = `https://graph.facebook.com/v19.0/${datasetId}/events?access_token=${accessToken}`;

    const response = await axios.post(url, eventPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });

    logger.info(`[Meta CAPI] Purchase event sent for order ${order.orderId}`, {
      status: response.status,
      events_received: response.data?.events_received
    });
  } catch (err) {
    logger.error(`[Meta CAPI] Error sending Purchase event for order ${order?.orderId}:`, {
      error: err.response?.data || err.message
    });
  }
}

module.exports = {
  sendCapiPurchaseEvent,
  hashValue,
  normalizePhone
};
