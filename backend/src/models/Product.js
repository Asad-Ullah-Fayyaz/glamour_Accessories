const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a product name'],
    trim: true,
    maxlength: [150, 'Product name cannot exceed 150 characters']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true
  },
  description: {
    type: String,
    required: [true, 'Please provide a product description']
  },
  price: {
    type: Number,
    required: [true, 'Please specify the product price'],
    min: [0, 'Price must be positive']
  },
  onSale: {
    type: Boolean,
    default: false,
    index: true
  },
  previousPrice: {
    type: Number,
    default: null,
    min: [0, 'Previous price must be positive']
  },
  stock: {
    type: Number,
    required: [true, 'Please specify available stock'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Product must belong to a category'],
    index: true
  },
  subCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubCategory',
    default: null,
    index: true
  },
  images: {
    type: [String],
    validate: [arrayMinLength, 'Product must have at least one image']
  },
  isFeatured: {
    type: Boolean,
    default: false,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
    isCustomizable: {
    type: Boolean,
    default: false,
    index: true
  },
    isOnSale: {
      type: Boolean,
      default: false,
      index: true
    },
    salePrice: {
      type: Number,
      default: undefined,
      min: [0, 'Sale price must be positive'],
      validate: {
        validator: function (value) {
          if (this.isOnSale !== true) {
            return true;
          }

          if (value === undefined || value === null) {
            return false;
          }

          return Number.isFinite(value) && value < this.price;
        },
        message: 'Sale price must be a finite number less than the regular price when the product is on sale'
      }
    },
    newIs: {
      type: Boolean,
      default: false,
      index: true
    },
    saleEnabledAt: {
      type: Date,
      default: null
    },
  attributes: {
    type: Map,
    of: String,
    default: {}
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  numReviews: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

function arrayMinLength(val) {
  return val && val.length > 0;
}

// Compound text index for search
productSchema.index({ name: 'text', description: 'text' });

// Compound index for featured category queries
productSchema.index({ category: 1, isFeatured: 1 });

module.exports = mongoose.model('Product', productSchema);
