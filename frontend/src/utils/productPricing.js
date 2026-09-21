export function productIsOnSale(product) {
  if (!product || product.onSale !== true) return false;
  const price = Number(product.price);
  const previousPrice = Number(product.previousPrice);
  return (
    Number.isFinite(price) &&
    price > 0 &&
    Number.isFinite(previousPrice) &&
    previousPrice > price
  );
}

export function getSellingPrice(product) {
  const price = Number(product && product.price);
  return Number.isFinite(price) && price >= 0 ? price : 0;
}

export const DEFAULT_ESTIMATED_DELIVERY =
  'Typically 2–4 business days for major cities, and 4–6 business days for remote areas across Pakistan.';
