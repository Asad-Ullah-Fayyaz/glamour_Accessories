/**
 * Shared business configuration — single source of truth.
 * The backend is authoritative; the frontend fetches these values for display only.
 */

module.exports = {
  SECURITY: {
    // Cost factor for EVERY bcrypt hash in this application. models/User.js uses it
    // in its pre('save') hook; controllers/authController.js uses it to build the
    // dummy hash that keeps admin-login response time constant. Both must read it
    // from here. bcryptjs derives the cost from the hash prefix, so if the two ever
    // drift apart the dummy comparison finishes at a visibly different speed than a
    // real one and reintroduces the account-enumeration timing oracle it exists to
    // close.
    BCRYPT_SALT_ROUNDS: 10,
  },


  ORDER: {
    VALID_STATUSES: [
      "Pending",
      "Confirmed",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
    ],
    // Allowed forward transitions (Cancellation handled separately)
    VALID_TRANSITIONS: {
      Pending: ["Confirmed", "Cancelled"],
      Confirmed: ["Processing", "Cancelled"],
      Processing: ["Shipped", "Cancelled"],
      Shipped: ["Delivered"], // Delivered orders cannot be cancelled
      Delivered: [], // Terminal state
      Cancelled: [], // Terminal state
    },
    MAX_QTY_PER_ITEM: 20,
  },

  PAGINATION: {
    DEFAULT_LIMIT: 12,
    MAX_LIMIT: 50,
    MAX_PAGE: 10000,
  },

  SEARCH: {
    MAX_LENGTH: 100,
  },

  SHIPPING: {
    STANDARD_SHIPPING_COST: 300,
    FREE_SHIPPING_THRESHOLD: 5000,
  },
};
