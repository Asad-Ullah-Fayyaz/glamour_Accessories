/**
 * Meta Pixel helper for Glamour Accessories.
 *
 * Wraps `window.fbq` so that:
 *   - Ad-blocked or failed-load environments don't crash the app.
 *   - Event names are centralized (no typos).
 *   - Tracking calls never throw.
 *
 * The Pixel is initialized here only after advertising tracking is allowed.
 * Everything after initialization flows through this helper.
 */

import {
  hasMetaTrackingConsent,
  META_PIXEL_ID,
  META_CONSENT_STORAGE_KEY,
  getMetaConsentToken,
  saveMetaConsentToken,
  clearMetaConsentToken,
  setVerifiedMetaTrackingConsent,
  buildBrowserPurchase,
  claimPurchaseEvent,
  clearMetaTrackingConsent,
  getMetaTrackingConsent,
  saveMetaTrackingConsent,
  shouldTrackPageView
} from './metaTracking';
import api from './api';

export const META_EVENTS = {
  PAGE_VIEW: 'PageView',
  VIEW_CONTENT: 'ViewContent',
  ADD_TO_CART: 'AddToCart',
  INITIATE_CHECKOUT: 'InitiateCheckout',
  PURCHASE: 'Purchase',
  SEARCH: 'Search',
  ADD_TO_WISHLIST: 'AddToWishlist'
};

const CONSENT_CHANGE_EVENT = 'meta-tracking-consent-change';

function installPixelBootstrap() {
  if (typeof window.fbq === 'function') return;

  const fbq = function () {
    if (fbq.callMethod) {
      fbq.callMethod.apply(fbq, arguments);
    } else {
      fbq.queue.push(arguments);
    }
  };
  window.fbq = fbq;
  if (!window._fbq) window._fbq = fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  const firstScript = document.getElementsByTagName('script')[0];
  if (firstScript?.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
  } else {
    document.head.appendChild(script);
  }
}

export function isMetaPixelInitialized() {
  return (
    typeof window !== 'undefined' &&
    window.__glamourMetaPixelInitialized === true
  );
}

export function initializeMetaPixel() {
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    !hasMetaTrackingConsent() ||
    !shouldTrackPageView(window.location.pathname)
  ) {
    return false;
  }

  if (isMetaPixelInitialized()) {
    window.fbq('consent', 'grant');
    window.fbq('track', META_EVENTS.PAGE_VIEW);
    return true;
  }

  installPixelBootstrap();
  window.fbq('consent', 'grant');
  window.fbq('init', META_PIXEL_ID);
  window.fbq('track', META_EVENTS.PAGE_VIEW);
  window.__glamourMetaPixelInitialized = true;
  return true;
}

function revokeMetaPixelConsent() {
  if (typeof window === 'undefined') return;

  if (typeof window.fbq === 'function') {
    window.fbq('consent', 'revoke');
  }

  if (typeof document !== 'undefined') {
    ['_fbp', '_fbc'].forEach((name) => {
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    });
  }
}

export function disableMetaPixelTracking() {
  setVerifiedMetaTrackingConsent('denied');
  revokeMetaPixelConsent();
}

export function setMetaTrackingConsent(consent) {
  if (consent !== 'granted' && consent !== 'denied') return Promise.resolve(false);

  const existingToken = getMetaConsentToken();
  if (consent === 'denied') {
    if (!saveMetaTrackingConsent('denied')) return Promise.resolve(false);
    setVerifiedMetaTrackingConsent('denied');
    clearMetaConsentToken();
    revokeMetaPixelConsent();
    window.dispatchEvent(new window.Event(CONSENT_CHANGE_EVENT));
  }

  return api.post('/consent/meta', {
    consent,
    token: existingToken || undefined
  }).then((response) => {
    if (
      response?.success !== true ||
      response.consent !== consent ||
      !saveMetaConsentToken(response.token)
    ) {
      throw new Error('The consent choice could not be verified.');
    }

    if (consent === 'granted' && !saveMetaTrackingConsent('granted')) {
      clearMetaConsentToken();
      throw new Error('The consent choice could not be saved.');
    }

    setVerifiedMetaTrackingConsent(consent);
    if (consent === 'granted') {
      initializeMetaPixel();
    } else {
      revokeMetaPixelConsent();
    }

    window.dispatchEvent(new window.Event(CONSENT_CHANGE_EVENT));
    return true;
  }).catch(() => {
    if (consent === 'granted') {
      setVerifiedMetaTrackingConsent(null);
      clearMetaTrackingConsent();
    } else {
      clearMetaConsentToken();
    }
    return false;
  });
}

export async function verifyMetaTrackingConsent() {
  if (getMetaTrackingConsent() === 'denied') {
    setVerifiedMetaTrackingConsent('denied');
    revokeMetaPixelConsent();
    return 'denied';
  }

  const token = getMetaConsentToken();
  if (!token) {
    clearMetaTrackingConsent();
    return null;
  }

  try {
    const response = await api.post('/consent/meta/verify', { token });
    const status = response?.success === true ? response.consent : null;
    if (status !== 'granted' && status !== 'denied') {
      clearMetaTrackingConsent();
      return null;
    }

    if (!saveMetaTrackingConsent(status)) {
      clearMetaTrackingConsent();
      return null;
    }
    setVerifiedMetaTrackingConsent(status);
    return status;
  } catch {
    clearMetaTrackingConsent();
    setVerifiedMetaTrackingConsent(null);
    return null;
  } finally {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new window.Event(CONSENT_CHANGE_EVENT));
    }
  }
}

export async function resetMetaTrackingConsent() {
  const saved = await setMetaTrackingConsent('denied');
  clearMetaTrackingConsent();
  revokeMetaPixelConsent();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new window.Event(CONSENT_CHANGE_EVENT));
  }
  return saved;
}

function isReady() {
  return (
    typeof window !== 'undefined' &&
    hasMetaTrackingConsent() &&
    isMetaPixelInitialized() &&
    typeof window.fbq === 'function'
  );
}

/**
 * Track a standard Meta Pixel event.
 * @param {string} eventName - One of META_EVENTS (or any valid Meta event name)
 * @param {object} [params] - value, currency, content_ids, content_name, etc.
 * @param {object} [options] - e.g. { eventID: 'order_12345' } for CAPI deduplication
 */
export function trackEvent(eventName, params, options) {
  if (!isReady()) return;
  try {
    if (params && typeof params === 'object') {
      if (options && typeof options === 'object') {
        window.fbq('track', eventName, params, options);
      } else {
        window.fbq('track', eventName, params);
      }
    } else if (options && typeof options === 'object') {
      window.fbq('track', eventName, {}, options);
    } else {
      window.fbq('track', eventName);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[MetaPixel] track failed:', err);
  }
}

/**
 * Extract a cookie by name from document.cookie.
 */
export function getMetaCookie(name) {
  if (typeof document === 'undefined' || !hasMetaTrackingConsent()) return '';
  const match = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : '';
}

export {
  buildBrowserPurchase,
  claimPurchaseEvent,
  getMetaConsentToken,
  getMetaTrackingConsent,
  hasMetaTrackingConsent,
  shouldTrackPageView,
  META_CONSENT_STORAGE_KEY
};

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