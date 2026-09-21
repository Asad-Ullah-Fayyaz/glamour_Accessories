const crypto = require('crypto');

/**
 * Generates a human-readable, collision-resistant Order Reference ID
 * Example: ORD-2026-7A9B3
 */
const generateOrderId = () => {
  const year = new Date().getFullYear();
  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ORD-${year}-${randomHex}`;
};

module.exports = generateOrderId;
