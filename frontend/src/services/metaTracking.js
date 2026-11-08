export const META_PIXEL_ID = '2078758886091501';
export const META_CONSENT_STORAGE_KEY = 'glamour_meta_tracking_consent';
export const META_CONSENT_TOKEN_KEY = 'glamour_meta_tracking_consent_token';

const PURCHASE_GUARD_PREFIX = 'meta_purchase_';
let verifiedConsentStatus = null;

function resolveStorage(storage) {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getMetaTrackingConsent(storage) {
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) return null;

  try {
    const value = resolvedStorage.getItem(META_CONSENT_STORAGE_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    return null;
  }
}

export function hasMetaTrackingConsent(storage) {
  return (
    getMetaTrackingConsent(storage) === 'granted' &&
    verifiedConsentStatus === 'granted'
  );
}

export function getMetaConsentToken(storage) {
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) return '';

  try {
    return resolvedStorage.getItem(META_CONSENT_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function saveMetaConsentToken(token, storage) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) return false;
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) return false;

  try {
    resolvedStorage.setItem(META_CONSENT_TOKEN_KEY, token);
    return true;
  } catch {
    return false;
  }
}

export function clearMetaConsentToken(storage) {
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) return false;

  try {
    resolvedStorage.removeItem(META_CONSENT_TOKEN_KEY);
    return true;
  } catch {
    return false;
  }
}

export function setVerifiedMetaTrackingConsent(status) {
  verifiedConsentStatus =
    status === 'granted' || status === 'denied' ? status : null;
}

export function saveMetaTrackingConsent(consent, storage) {
  if (consent !== 'granted' && consent !== 'denied') return false;
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) return false;

  try {
    resolvedStorage.setItem(META_CONSENT_STORAGE_KEY, consent);
    return true;
  } catch {
    return false;
  }
}

export function clearMetaTrackingConsent(storage) {
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) return false;

  try {
    resolvedStorage.removeItem(META_CONSENT_STORAGE_KEY);
    resolvedStorage.removeItem(META_CONSENT_TOKEN_KEY);
    verifiedConsentStatus = null;
    return true;
  } catch {
    return false;
  }
}

export function claimPurchaseEvent(orderId, storage) {
  if (typeof orderId !== 'string' || !orderId) return false;
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) return false;

  const guardKey = `${PURCHASE_GUARD_PREFIX}${orderId}`;

  try {
    if (resolvedStorage.getItem(guardKey)) return false;
    resolvedStorage.setItem(guardKey, '1');
    return true;
  } catch {
    return false;
  }
}

export function shouldTrackPageView(pathname) {
  return typeof pathname === 'string' && !pathname.startsWith('/admin');
}

export function getProductTrackingPrice(product) {
  const regularPrice = product?.price;
  if (
    typeof regularPrice !== 'number' ||
    !Number.isFinite(regularPrice) ||
    regularPrice < 0
  ) {
    return null;
  }

  const salePrice = product?.salePrice;
  if (
    product?.isOnSale === true &&
    typeof salePrice === 'number' &&
    Number.isFinite(salePrice) &&
    salePrice > 0 &&
    salePrice < regularPrice
  ) {
    return salePrice;
  }

  return regularPrice;
}

export function buildBrowserPurchase(order) {
  if (typeof order?.orderId !== 'string' || !order.orderId) return null;

  const value = order.totalAmount;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || !Array.isArray(order.items)) {
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

  const eventID = order.orderId;
  return {
    eventID,
    params: {
      value,
      currency: 'PKR',
      content_ids: contents.map((item) => item.id),
      contents,
      content_type: 'product',
      num_items: contents.reduce((sum, item) => sum + item.quantity, 0),
      order_id: order.orderId
    }
  };
}
