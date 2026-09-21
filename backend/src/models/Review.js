const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Review must belong to a product'],
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a customer'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      maxlength: [100, 'Customer name cannot exceed 100 characters']
    },
    rating: {
      type: Number,
      required: [true, 'Please provide a star rating'],
      min: [1, 'Rating must be at least 1 star'],
      max: [5, 'Rating cannot exceed 5 stars']
    },
    comment: {
      type: String,
      required: [true, 'Please provide a review comment'],
      trim: true,
      minlength: [3, 'Review comment must be at least 3 characters'],
      maxlength: [1000, 'Review comment cannot exceed 1000 characters']
    },
    status: {
      type: String,
      enum: ['approved', 'pending', 'rejected'],
      default: 'approved',
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate reviews per product by the same user
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// Compound index for product review queries
reviewSchema.index({ product: 1, status: 1, createdAt: -1 });

// Static method to recalculate product average rating & review count
reviewSchema.statics.calcAverageRating = async function (productId) {
  const stats = await this.aggregate([
    {
      $match: { product: productId, status: 'approved' }
    },
    {
      $group: {
        _id: '$product',
        numReviews: { $sum: 1 },
        averageRating: { $avg: '$rating' }
      }
    }
  ]);

  const Product = mongoose.model('Product');

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      numReviews: stats[0].numReviews,
      averageRating: Math.round(stats[0].averageRating * 10) / 10
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      numReviews: 0,
      averageRating: 0
    });
  }
};

reviewSchema.post('save', async function () {
  await this.constructor.calcAverageRating(this.product);
});

module.exports = mongoose.model('Review', reviewSchema);
