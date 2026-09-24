const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a category name'],
      trim: true,
      maxlength: [150, 'Category name cannot exceed 150 characters']
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
      default: '',
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    image: {
      type: String,
      default: ''
    },

    // ── Self-referencing parent ──
    // null          → this is a LEVEL 1 category (Men, Women, Home Decor)
    // <L1 _id>      → this is a LEVEL 2 category (Pants, Shirts)
    // <L2 _id>      → this is a LEVEL 3 category (Chinos, Polo)
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true
    },

    // ── Explicit depth marker ──
    // 1 = main category
    // 2 = sub-category
    // 3 = sub-sub-category
    // Enforced by controllers; used to keep queries and validation clean.
    level: {
      type: Number,
      enum: [1, 2, 3],
      required: true,
      index: true
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  { timestamps: true }
);

// Fast lookup of siblings / children: (parent, level, isActive)
categorySchema.index({ parent: 1, level: 1, isActive: 1 });

// Fast lookup of full tree per L1
categorySchema.index({ level: 1, parent: 1, createdAt: 1 });

// Auto-generate slug from name if not provided
categorySchema.pre('validate', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

module.exports = mongoose.model('Category', categorySchema);
