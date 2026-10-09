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
        if (this.isOnSale !== true) return true;
        if (value === undefined || value === null) return false;
        return Number.isFinite(value) && value < this.price;
      },
      message:
        'Sale price must be a finite number less than the regular price when the product is on sale'
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

  // ─────────────────────────────────────────────────────────────
  // Customer Trust Media — a single sliding carousel that appears
  // on the product detail page. Accepts BOTH images and videos.
  //
  // Purpose: showcase real customer proof — WhatsApp screenshots,
  // unboxing photos, customer videos, DM compliments, etc.
  //
  // Each entry stores the uploaded file's URL (Cloudinary), its
  // media type, and optional display metadata.
  // ─────────────────────────────────────────────────────────────
  trustMedia: [
    {
      _id: false,
      url: {
        type: String,
        required: true,
        trim: true,
        maxlength: [2048, 'Media URL is too long']
      },
      // 'image' or 'video' — decided at upload time
      type: {
        type: String,
        enum: ['image', 'video'],
        default: 'image'
      },
      // Optional Cloudinary public_id, kept so we could delete the
      // asset later if needed. Not required.
      publicId: {
        type: String,
        default: ''
      },
      // Optional short caption shown under the media (e.g. "Loved it!")
      caption: {
        type: String,
        default: '',
        maxlength: [200, 'Caption cannot exceed 200 characters']
      },
      // Optional customer name (first name only recommended)
      customerName: {
        type: String,
        default: '',
        maxlength: [50, 'Customer name cannot exceed 50 characters']
      },
      // Optional city
      city: {
        type: String,
        default: '',
        maxlength: [50, 'City cannot exceed 50 characters']
      },
      // Optional rating 1–5 (used to render stars on the slide)
      rating: {
        type: Number,
        min: 1,
        max: 5,
        default: undefined
      },
      // Optional timestamp shown as "x days ago" — auto-set on add
      addedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],

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

productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1, isFeatured: 1 });

module.exports = mongoose.model('Product', productSchema);