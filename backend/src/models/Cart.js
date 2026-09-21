const mongoose = require('mongoose');

// Lens option subdocument — a snapshot of the admin-configured option
// the customer chose. Stored inline so the cart line remains valid even
// if the admin later changes or removes the lens option from settings.
const lensOptionSchema = new mongoose.Schema({
  name: {
    type: String,
    default: '',
    maxlength: [80, 'Lens option name cannot exceed 80 characters']
  },
  description: {
    type: String,
    default: '',
    maxlength: [500, 'Lens option description cannot exceed 500 characters']
  },
  price: {
    type: Number,
    default: 0,
    min: [0, 'Lens option price cannot be negative']
  }
}, { _id: false });

// Customization subdocument — attached per cart item.
// Only present for customizable products (e.g. prescription glasses).
const customizationSchema = new mongoose.Schema({
  // Free-text prescription or special instructions written by the customer
  description: {
    type: String,
    default: '',
    maxlength: [2000, 'Customization description cannot exceed 2000 characters']
  },
  // Cloudinary HTTPS URL of the uploaded prescription image (optional)
  prescriptionImage: {
    type: String,
    default: '',
    maxlength: [2048, 'Prescription image URL is too long']
  },
  // Optional lens option chosen by the customer. Undefined if the customer
  // did not pick a lens type (e.g. buying just the frame with no prescription).
  lensOption: {
    type: lensOptionSchema,
    default: undefined
  }
}, { _id: false });

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
    default: 1
  },
  customization: {
    type: customizationSchema,
    default: undefined
  }
});
// NOTE: `_id` is intentionally NOT disabled — Mongoose auto-generates a unique
// ObjectId for every cart line. This is what makes it possible to update or
// remove a specific line when the same product appears multiple times with
// different customizations.

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [cartItemSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('Cart', cartSchema);