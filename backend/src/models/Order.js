const mongoose = require('mongoose');

// Lens option snapshot — captured at order time.
// Mirrors the Cart model's lensOption subdocument so the customer's chosen
// lens survives from cart → checkout → order → admin view.
const orderLensOptionSchema = new mongoose.Schema({
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

// Customization snapshot — captured at order time.
const orderCustomizationSchema = new mongoose.Schema({
  description: {
    type: String,
    default: '',
    maxlength: [2000, 'Customization description cannot exceed 2000 characters']
  },
  prescriptionImage: {
    type: String,
    default: '',
    maxlength: [2048, 'Prescription image URL is too long']
  },
  lensOption: {
    type: orderLensOptionSchema,
    default: undefined
  }
}, { _id: false });

const orderItemSnapshotSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  previousPrice: { type: Number, default: undefined },
  isOnSaleAtPurchase: { type: Boolean, default: false },
  image: { type: String, default: '' },
  // Optional — only present for customized products
  customization: {
    type: orderCustomizationSchema,
    default: undefined
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // allows guest checkout
    default: null,
    index: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  items: [orderItemSnapshotSchema],
  shippingAddress: {
    fullName: { type: String, required: true },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      // Pakistani mobile format: 11 digits, no spaces, starts with 03
      validate: {
        validator: function (v) {
          if (!v) return false;
          return /^03\d{9}$/.test(v);
        },
        message: 'Phone number must be exactly 11 digits and start with 03 (e.g. 03001234567)'
      }
    },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, default: '' },
    postalCode: { type: String, required: false },
    country: { type: String, default: 'Pakistan' }
  },
  paymentMethod: {
    type: String,
    enum: ['COD'],
    default: 'COD',
    required: true
  },
  subtotal: { type: Number, required: true },
  shippingCost: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
    default: 'Pending',
    index: true
  },
  courierInfo: {
    carrier: { type: String, default: '' },
    trackingId: { type: String, default: '', index: true },
    shippedAt: { type: Date, default: null }
  },
  adminNotes: { type: String, default: '' }
}, {
  timestamps: true
});

// Compound index for fast customer order history queries
orderSchema.index({ customer: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);