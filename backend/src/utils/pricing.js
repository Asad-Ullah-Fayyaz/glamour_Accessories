/**
 * Authoritative product selling-price helpers.
 * Carts and orders must use these against a database product — never a client-submitted price.
 */

function productIsOnSale(product) {
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

function getSellingPrice(product) {
  const price = Number(product && product.price);
  return Number.isFinite(price) && price >= 0 ? price : 0;
}

function normalizeSaleFields(body = {}) {
  const onSale = body.onSale === true || body.onSale === 'true';

  if (!onSale) {
    return { onSale: false, previousPrice: null };
  }

  const previousPrice = Number(body.previousPrice);
  const salePrice = Number(body.price);

  if (!Number.isFinite(previousPrice) || previousPrice <= 0) {
    return {
      error: 'Previous price is required and must be a positive number when the product is on sale'
    };
  }

  if (!Number.isFinite(salePrice) || salePrice <= 0) {
    return { error: 'Sale price must be a positive number' };
  }

  if (salePrice >= previousPrice) {
    return { error: 'Sale price must be less than the previous price' };
  }

  return { onSale: true, previousPrice };
}

module.exports = {
  productIsOnSale,
  getSellingPrice,
  normalizeSaleFields
};
