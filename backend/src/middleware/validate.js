/**
 * Zod-based request validation middleware.
 * Validates body/query/params and returns clean, user-friendly errors.
 * Raw Mongoose/DB errors are never exposed — the errorHandler handles that.
 */

const { validationResult } = require("express-validator");

// Uses express-validator for route-level chain definitions.
// This middleware runs AFTER the chains and formats errors consistently.
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map((e) => ({
      field: e.path || e.param,
      message: e.msg,
    }));
    return res.status(400).json({
      success: false,
      message: details[0].message,
      errors: details,
    });
  }
  next();
};

module.exports = { validate };
