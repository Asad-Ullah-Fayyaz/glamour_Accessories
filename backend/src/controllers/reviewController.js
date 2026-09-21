const Review = require('../models/Review');
const Product = require('../models/Product');
const logger = require('../utils/logger');

// @desc    Create a product review
// @route   POST /api/products/:productId/reviews
// @access  Private (Customers)
const createProductReview = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { rating, comment } = req.body;

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Prevent Super Admin environment pseudo-user or invalid user from creating DB relations
    if (!req.user || !req.user._id) {
      return res.status(400).json({
        success: false,
        message: 'Valid customer account required to post a review'
      });
    }

    // Check for duplicate review by same user on this product
    const alreadyReviewed = await Review.findOne({
      product: productId,
      user: req.user._id
    });

    if (alreadyReviewed) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }

    const review = await Review.create({
      product: productId,
      user: req.user._id,
      name: req.user.name || 'Anonymous Customer',
      rating: Number(rating),
      comment,
      status: 'approved'
    });

    res.status(201).json({
      success: true,
      message: 'Thank you! Your review has been published.',
      review
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a review for this product.'
      });
    }
    next(err);
  }
};

// @desc    Get approved reviews for a specific product
// @route   GET /api/products/:productId/reviews
// @access  Public
const getProductReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const reviews = await Review.find({
      product: productId,
      status: 'approved'
    }).sort({ createdAt: -1 });

    const product = await Product.findById(productId).select('averageRating numReviews');

    res.status(200).json({
      success: true,
      reviews,
      averageRating: product ? product.averageRating : 0,
      numReviews: product ? product.numReviews : 0
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current user's review for a product
// @route   GET /api/products/:productId/reviews/me
// @access  Private
const getUserProductReview = async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!req.user || !req.user._id) {
      return res.status(200).json({ success: true, review: null });
    }

    const review = await Review.findOne({
      product: productId,
      user: req.user._id
    });

    res.status(200).json({
      success: true,
      review: review || null
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get selected reviews for Homepage Customer Reviews section
// @route   GET /api/reviews/homepage
// @access  Public
const getHomepageReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({
      status: 'approved',
      rating: { $gte: 4 }
    })
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('product', 'name slug images price');

    res.status(200).json({
      success: true,
      reviews
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update a review
// @route   PUT /api/reviews/:id
// @access  Private
const updateReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check ownership or admin privileges
    const isOwner = req.user && review.user.toString() === req.user._id.toString();
    const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'superadmin');

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this review'
      });
    }

    if (req.body.rating) review.rating = Number(req.body.rating);
    if (req.body.comment) review.comment = req.body.comment;

    await review.save();

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      review
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private
const deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check ownership or admin privileges
    const isOwner = req.user && review.user.toString() === req.user._id.toString();
    const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'superadmin');

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review'
      });
    }

    const productId = review.product;
    await review.deleteOne();
    await Review.calcAverageRating(productId);

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all reviews for Admin Console
// @route   GET /api/admin/reviews
// @access  Private/Admin
const getAdminReviews = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (status && ['approved', 'pending', 'rejected'].includes(status)) {
      filter.status = status;
    }

    const reviews = await Review.find(filter)
      .sort({ createdAt: -1 })
      .populate('product', 'name slug images price')
      .populate('user', 'name email');

    const stats = {
      total: await Review.countDocuments(),
      approved: await Review.countDocuments({ status: 'approved' }),
      pending: await Review.countDocuments({ status: 'pending' }),
      rejected: await Review.countDocuments({ status: 'rejected' })
    };

    res.status(200).json({
      success: true,
      reviews,
      stats
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update review moderation status (Admin)
// @route   PUT /api/admin/reviews/:id/status
// @access  Private/Admin
const updateReviewStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['approved', 'pending', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value. Must be approved, pending, or rejected'
      });
    }

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    review.status = status;
    await review.save();

    res.status(200).json({
      success: true,
      message: `Review status changed to ${status}`,
      review
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createProductReview,
  getProductReviews,
  getUserProductReview,
  getHomepageReviews,
  updateReview,
  deleteReview,
  getAdminReviews,
  updateReviewStatus
};
