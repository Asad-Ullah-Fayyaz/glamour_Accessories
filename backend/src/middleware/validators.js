/**
 * Reusable validation rule chains (express-validator).
 */

const { body, query, param, validationResult } = require("express-validator");
const { PAGINATION, SEARCH, ORDER } = require("../config/constants");

const emailRule = body("email")
  .trim()
  .isEmail()
  .withMessage("Please provide a valid email address")
  .normalizeEmail();

const passwordRule = body("password")
  .isString()
  .withMessage("Password must be a string")
  .isLength({ min: 8 })
  .withMessage("Password must be at least 8 characters")
  .matches(/[A-Za-z]/)
  .withMessage("Password must contain at least one letter")
  .matches(/\d/)
  .withMessage("Password must contain at least one number");

// Positive integer quantity (rejects 0, negatives, floats, NaN, strings)
const quantityRule = (
  field = "quantity",
  { required = true, max = ORDER.MAX_QTY_PER_ITEM } = {},
) => {
  const chain = required
    ? body(field).exists({ checkFalsy: true })
    : body(field).optional();
  return chain
    .bail()
    .custom((v) => Number.isInteger(Number(v)) && Number(v) >= 1)
    .withMessage("Quantity must be a whole number of at least 1")
    .custom((v) => Number(v) <= max)
    .withMessage(`Quantity cannot exceed ${max} units per item`)
    .customSanitizer((v) => Number(v));
};

const paginationRules = [
  query("page")
    .optional()
    .isInt({ min: 1, max: PAGINATION.MAX_PAGE })
    .withMessage("Invalid page number")
    .customSanitizer((v) => parseInt(v, 10)),
  query("limit")
    .optional()
    .isInt({ min: 1, max: PAGINATION.MAX_LIMIT })
    .withMessage(`Limit must be between 1 and ${PAGINATION.MAX_LIMIT}`)
    .customSanitizer((v) => parseInt(v, 10)),
  query("sort")
    .optional()
    .isIn(["newest", "price-asc", "price-desc", "featured"])
    .withMessage("Invalid sort option"),
  query("search")
    .optional()
    .trim()
    .isLength({ max: SEARCH.MAX_LENGTH })
    .withMessage(`Search cannot exceed ${SEARCH.MAX_LENGTH} characters`),
  query("category")
    .optional({ checkFalsy: true })
    .trim()
    .isSlug()
    .withMessage("Invalid category"),
  query("subCategory")
    .optional({ checkFalsy: true })
    .trim()
    .isSlug()
    .withMessage("Invalid subcategory"),
  query("minPrice")
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage("Invalid minimum price")
    .customSanitizer(Number),
  query("maxPrice")
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage("Invalid maximum price")
    .customSanitizer(Number),
];

const registerRules = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: 100 })
    .withMessage("Name is too long"),
  emailRule,
  passwordRule,
];

const loginRules = [
  emailRule,
  body("password").isString().notEmpty().withMessage("Password is required"),
];

const addressRules = [
  body("addresses.*.fullName").optional().trim().isLength({ max: 100 }),
  body("addresses.*.phone")
    .optional()
    .trim()
    .isLength({ max: 20 })
    .matches(/^[+\d][\d\s\-()]{6,19}$/)
    .withMessage("Invalid phone number"),
  body("addresses.*.street").optional().trim().isLength({ max: 200 }),
  body("addresses.*.city").optional().trim().isLength({ max: 80 }),
  body("addresses.*.postalCode").optional().trim().isLength({ max: 12 }),
];

const productRules = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 150 })
    .withMessage("Product name must be 2-150 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage("Description must be 1-5000 characters"),
  body("price")
    .optional({ checkFalsy: false })
    .custom(
      (v) =>
        v === undefined ||
        v === "" ||
        (typeof v === "number" && Number.isFinite(v) && v > 0),
    )
    .withMessage("Price must be a positive number"),
  body("stock")
    .optional()
    .custom(
      (v) =>
        v === undefined ||
        v === "" ||
        (Number.isInteger(Number(v)) && Number(v) >= 0),
    )
    .withMessage("Stock must be a non-negative whole number")
    .customSanitizer((v) =>
      v === "" || v === undefined ? undefined : Number(v),
    ),
  body("category")
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage("Invalid category"),
  body("subCategory")
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage("Invalid subcategory"),
  body("images")
    .optional()
    .isArray({ max: 8 })
    .withMessage("Maximum 8 images allowed"),
  body("images.*").optional().trim().isLength({ max: 2048 }).isString(),
  body("isFeatured").optional().isBoolean().customSanitizer(Boolean),
  body("isActive").optional().isBoolean().customSanitizer(Boolean),
  body("onSale").optional().isBoolean(),
  body("previousPrice")
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ gt: 0 })
    .withMessage("Previous price must be a positive number")
    .customSanitizer((v) => (v === "" || v === null ? undefined : Number(v))),
  body().custom((body) => {
    if (body.onSale !== true && body.onSale !== "true") return true;
    const salePrice = Number(body.price);
    const previousPrice = Number(body.previousPrice);
    if (!Number.isFinite(previousPrice) || previousPrice <= 0) {
      throw new Error(
        "Previous price is required when the product is on sale",
      );
    }
    if (!Number.isFinite(salePrice) || salePrice <= 0) {
      throw new Error("Sale price must be a positive number");
    }
    if (salePrice >= previousPrice) {
      throw new Error("Sale price must be less than the previous price");
    }
    return true;
  }),
];

const createProductRules = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Product name is required")
    .isLength({ min: 2, max: 150 }),
  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ min: 1, max: 5000 })
    .withMessage("Description must be between 1 - 5000 characters"),
  body("price")
    .exists({ checkFalsy: true })
    .isFloat({ gt: 0 })
    .withMessage("Price must be a positive number")
    .customSanitizer(Number),
  body("stock")
    .exists({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative whole number")
    .customSanitizer(Number),
  body("category")
    .exists({ checkFalsy: true })
    .isMongoId()
    .withMessage("A valid category is required"),
  body("subCategory").optional({ checkFalsy: true }).isMongoId(),
  body("images").optional().isArray({ max: 8 }),
  body("images.*").optional().trim().isString().isLength({ max: 2048 }),
  body("onSale").optional().isBoolean(),
  body("previousPrice")
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ gt: 0 })
    .withMessage("Previous price must be a positive number")
    .customSanitizer((v) => (v === "" || v === null ? undefined : Number(v))),
  body().custom((body) => {
    if (body.onSale !== true && body.onSale !== "true") return true;
    const salePrice = Number(body.price);
    const previousPrice = Number(body.previousPrice);
    if (!Number.isFinite(previousPrice) || previousPrice <= 0) {
      throw new Error(
        "Previous price is required when the product is on sale",
      );
    }
    if (!Number.isFinite(salePrice) || salePrice <= 0) {
      throw new Error("Sale price must be a positive number");
    }
    if (salePrice >= previousPrice) {
      throw new Error("Sale price must be less than the previous price");
    }
    return true;
  }),
];

const shippingAddressRules = [
  body("shippingAddress.fullName")
    .trim()
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ max: 100 }),
  body("shippingAddress.phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^[+\d][\d\s\-()]{6,19}$/)
    .withMessage("Invalid phone number"),
  body("shippingAddress.street")
    .trim()
    .notEmpty()
    .withMessage("Street address is required")
    .isLength({ max: 200 }),
  body("shippingAddress.city")
    .trim()
    .notEmpty()
    .withMessage("City is required")
    .isLength({ max: 80 }),
  body("shippingAddress.postalCode")
    .trim()
    .notEmpty()
    .withMessage("Postal code is required")
    .isLength({ max: 12 }),
  body("shippingAddress.state")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 80 }),
  body("shippingAddress.country")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 80 }),
];

const createOrderRules = [
  body("items")
    .exists()
    .isArray({ min: 1, max: 50 })
    .withMessage("Order must contain 1-50 items"),
  body("items.*.productId")
    .isMongoId()
    .withMessage("Invalid product reference"),
  body("items.*.quantity")
    .custom((v) => Number.isInteger(Number(v)) && Number(v) >= 1)
    .withMessage("Quantity must be a whole number of at least 1")
    .custom((v) => Number(v) <= ORDER.MAX_QTY_PER_ITEM)
    .withMessage(
      `Quantity cannot exceed ${ORDER.MAX_QTY_PER_ITEM} units per item`,
    )
    .customSanitizer((v) => Number(v)),
  // NOTE: no price accepted from client — prices are computed server-side
  shippingAddressRules,
];

const trackingRules = [
  body("trackingId")
    .trim()
    .notEmpty()
    .withMessage("Courier Tracking ID is required")
    .isLength({ min: 3, max: 40 })
    .withMessage("Tracking ID must be 3-40 characters")
    .matches(/^[A-Za-z0-9\-_]+$/)
    .withMessage(
      "Tracking ID may only contain letters, numbers, dashes and underscores",
    ),
  body("carrier").optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
  body("updateStatusToShipped").optional().isBoolean().customSanitizer(Boolean),
];

const forgotPasswordRules = [emailRule];
const resetPasswordRules = [
  body("token")
    .trim()
    .notEmpty()
    .withMessage("Reset token is required")
    .isLength({ max: 128 }),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/[A-Za-z]/)
    .withMessage("Password must contain at least one letter")
    .matches(/\d/)
    .withMessage("Password must contain at least one number"),
];

const categoryRules = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Category name is required")
    .isLength({ max: 80 }),
  body("description")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 }),
  body("categoryId")
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage("Invalid category reference"),
];

// Final step in validation chains — collects errors and returns a clean 400
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return res.status(400).json({
    success: false,
    message: "Validation failed",
    errors: errors.array().map((e) => ({
      field: e.path,
      message: e.msg,
    })),
  });
};

const subscriberRules = [emailRule];

const createReviewRules = [
  body("rating")
    .exists()
    .withMessage("Star rating is required")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be an integer between 1 and 5"),
  body("comment")
    .trim()
    .notEmpty()
    .withMessage("Review comment is required")
    .isLength({ min: 3, max: 1000 })
    .withMessage("Review comment must be between 3 and 1000 characters"),
];

const updateReviewRules = [
  body("rating")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be an integer between 1 and 5"),
  body("comment")
    .optional()
    .trim()
    .isLength({ min: 3, max: 1000 })
    .withMessage("Review comment must be between 3 and 1000 characters"),
];

module.exports = {
  validate: handleValidationErrors,
  registerRules,
  loginRules,
  addressRules,
  paginationRules,
  productRules,
  createProductRules,
  createOrderRules,
  trackingRules,
  forgotPasswordRules,
  resetPasswordRules,
  categoryRules,
  quantityRule,
  subscriberRules,
  createReviewRules,
  updateReviewRules,
};
