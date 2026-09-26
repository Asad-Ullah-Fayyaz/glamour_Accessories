/**
 * Meta Pixel helper for Glamour Accessories.
 *
 * Wraps `window.fbq` so that:
 *   - Ad-blocked or failed-load environments don't crash the app.
 *   - Event names are centralized (no typos).
 *   - Tracking calls never throw.
 *
 * The base snippet is in frontend/index.html. It loads fbevents.js and
 * fires the first PageView. Everything after that flows through here.
 */

export const META_EVENTS = {
  PAGE_VIEW: 'PageView',
  VIEW_CONTENT: 'ViewContent',
  ADD_TO_CART: 'AddToCart',
  INITIATE_CHECKOUT: 'InitiateCheckout',
  PURCHASE: 'Purchase',
  SEARCH: 'Search',
  ADD_TO_WISHLIST: 'AddToWishlist'
};

function isReady() {
  return typeof window !== 'undefined' && typeof window.fbq === 'function';
}

/**
 * Track a standard Meta Pixel event.
 * @param {string} eventName - One of META_EVENTS (or any valid Meta event name)
 * @param {object} [params] - value, currency, content_ids, content_name, etc.
 */
export function trackEvent(eventName, params) {
  if (!isReady()) return;
  try {
    if (params && typeof params === 'object') {
      window.fbq('track', eventName, params);
    } else {
      window.fbq('track', eventName);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[MetaPixel] track failed:', err);
  }
}

/**
 * Track a custom (non-standard) event.
 */
export function trackCustom(eventName, params) {
  if (!isReady()) return;
  try {
    if (params && typeof params === 'object') {
      window.fbq('trackCustom', eventName, params);
    } else {
      window.fbq('trackCustom', eventName);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[MetaPixel] trackCustom failed:', err);
  }
}