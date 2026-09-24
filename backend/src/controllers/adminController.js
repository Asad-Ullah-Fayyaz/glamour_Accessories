const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { sendTrackingEmail } = require('../services/emailService');
const { ORDER } = require('../config/constants');
const logger = require('../utils/logger');
const Category = require('../models/Category');
const { config } = require('../config/env');
// @desc    Get admin dashboard metrics
// @route   GET /api/admin/dashboard
// @access  Private (Admin Only)
exports.getDashboardStats = async (req, res, next) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'Pending' });
    const confirmedOrders = await Order.countDocuments({ status: 'Confirmed' });
    const processingOrders = await Order.countDocuments({ status: 'Processing' });
    const shippedOrders = await Order.countDocuments({ status: 'Shipped' });
    const deliveredOrders = await Order.countDocuments({ status: 'Delivered' });
    const cancelledOrders = await Order.countDocuments({ status: 'Cancelled' });

    // Calculate total revenue from delivered and valid active orders
    const revenueResult = await Order.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    const totalProducts = await Product.countDocuments();
    const lowStockProducts = await Product.find({ stock: { $lte: 5 } }).select('name stock price category').limit(5);

    const totalCustomers = await User.countDocuments({ role: 'customer' });

    const recentOrders = await Order.find()
      .sort('-createdAt')
      .limit(6)
      .populate('customer', 'name email');

    res.status(200).json({
      success: true,
      stats: {
        totalRevenue,
        totalOrders,
        pendingOrders,
        confirmedOrders,
        processingOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        totalProducts,
        totalCustomers,
        lowStockCount: lowStockProducts.length,
        lowStockProducts,
        recentOrders
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all store orders (with optional status filter & pagination)
// @route   GET /api/admin/orders
// @access  Private (Admin Only)
exports.getAllOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status && status !== 'All') {
      query.status = status;
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .sort('-createdAt')
      .skip(skip)
      .limit(limitNum)
      .populate('customer', 'name email');

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      pages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      orders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status
// @route   PUT /api/admin/orders/:id/status
// @access  Private (Admin Only)
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, adminNotes } = req.body;

    if (!ORDER.VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid order status transition' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Idempotency: setting the same status again is a no-op (prevents double-restock on retries)
    if (order.status === status) {
      return res.status(200).json({
        success: true,
        message: `Order is already ${status}`,
        order
      });
    }

    // Enforce valid state machine transitions — the UI cannot bypass this.
    const allowed = ORDER.VALID_TRANSITIONS[order.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change order from '${order.status}' to '${status}'. Allowed: ${allowed.length ? allowed.join(', ') : 'none (terminal state)'}.`
      });
    }

    // Require tracking ID before shipping
    if (status === 'Shipped' && (!order.courierInfo || !order.courierInfo.trackingId)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot transition order status to Shipped without entering a valid Courier Tracking ID first.'
      });
    }

    // Idempotent restock: only cancel-transitioning orders restock, exactly once.
    // The transition check above already guarantees this runs at most once per order.
    if (status === 'Cancelled') {
      for (const item of order.items) {
        // eslint-disable-next-line no-await-in-loop
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity }
        });
      }
      logger.info('Order cancelled — stock restored', {
        orderId: order.orderId,
        items: order.items.length
      });
    }

    const previousStatus = order.status;
    order.status = status;
    if (adminNotes !== undefined) order.adminNotes = adminNotes;
    await order.save();

    logger.info('Order status updated', {
      orderId: order.orderId,
      from: previousStatus,
      to: status,
      admin: req.user._id
    });

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign courier tracking ID and trigger dispatch email
// @route   POST /api/admin/orders/:id/tracking
// @access  Private (Admin Only)
exports.assignTrackingId = async (req, res, next) => {
  try {
    const { carrier, trackingId, updateStatusToShipped = true } = req.body;

    if (!trackingId || trackingId.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Courier Tracking ID cannot be blank' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const previousTrackingId = order.courierInfo ? order.courierInfo.trackingId : null;

    order.courierInfo = {
      carrier: carrier ? carrier.trim() : 'Standard Courier Service',
      trackingId: trackingId.trim(),
      shippedAt: new Date()
    };

    if (updateStatusToShipped) {
      order.status = 'Shipped';
    }

    await order.save();

    // Trigger tracking email only if the tracking ID is new or changed
    if (previousTrackingId !== trackingId.trim()) {
      sendTrackingEmail(order).catch((err) =>
        logger.error('Tracking email FAILED', {
          orderId: order.orderId,
          error: err.message
        })
      );
    } else {
      logger.info('Tracking ID unchanged — email skipped', { orderId: order.orderId });
    }

    res.status(200).json({
      success: true,
      message: 'Courier tracking information assigned and dispatch email sent.',
      order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all customers list
// @route   GET /api/admin/customers
// @access  Private (Admin Only)
exports.getCustomers = async (req, res, next) => {
  try {
    const customers = await User.find({ role: 'customer' }).select('-password').sort('-createdAt');

    // Attach order summary for each customer
    const customersWithOrders = await Promise.all(
      customers.map(async (cust) => {
        const orderCount = await Order.countDocuments({ customer: cust._id });
        const lastOrder = await Order.findOne({ customer: cust._id }).sort('-createdAt').select('orderId createdAt totalAmount status');
        return {
          ...cust.toObject(),
          orderCount,
          lastOrder
        };
      })
    );

    res.status(200).json({
      success: true,
      count: customersWithOrders.length,
      customers: customersWithOrders
    });
  } catch (error) {
    next(error);
  }
};
// @desc    Get all products for admin (includes inactive/disabled products)
// @route   GET /api/admin/products
// @access  Private (Admin Only)
exports.getAdminProducts = async (req, res, next) => {
  try {
    const { search, category, limit = 50, page = 1 } = req.query;

    const query = {};

    if (category && category !== 'All') {
      const catObj = await Category.findOne({ slug: category }).select('_id level');
      if (!catObj) {
        return res.status(200).json({
          success: true,
          count: 0,
          total: 0,
          pages: 0,
          currentPage: 1,
          products: []
        });
      }

      const catIds = [catObj._id];
      if (catObj.level === 1) {
        const l2 = await Category.find({ parent: catObj._id }).select('_id').lean();
        catIds.push(...l2.map((c) => c._id));
        if (l2.length > 0) {
          const l3 = await Category.find({ parent: { $in: l2.map((c) => c._id) } })
            .select('_id')
            .lean();
          catIds.push(...l3.map((c) => c._id));
        }
      } else if (catObj.level === 2) {
        const l3 = await Category.find({ parent: catObj._id }).select('_id').lean();
        catIds.push(...l3.map((c) => c._id));
      }

      query.category = { $in: catIds };
    }

    if (search) {
      const escaped = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { slug: { $regex: escaped, $options: 'i' } }
      ];
    }

    const limitNum = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const pageNum = Math.max(Number(page) || 1, 1);
    const skip = (pageNum - 1) * limitNum;

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category', 'name slug level parent')
      .sort('-createdAt')
      .skip(skip)
      .limit(limitNum);

    const attachPath = async (product) => {
      if (!product.category) {
        return { ...product.toObject(), categoryPath: { l1: null, l2: null, l3: null } };
      }

      const path = { l1: null, l2: null, l3: null };
      let current = product.category;
      let guard = 0;
      while (current && guard < 4) {
        if (current.level === 1) path.l1 = current;
        else if (current.level === 2) path.l2 = current;
        else if (current.level === 3) path.l3 = current;
        if (!current.parent) break;
        // eslint-disable-next-line no-await-in-loop
        current = await Category.findById(current.parent)
          .select('name slug level parent')
          .lean();
        guard += 1;
      }
      return { ...product.toObject(), categoryPath: path };
    };

    const enriched = await Promise.all(products.map(attachPath));

    res.status(200).json({
      success: true,
      count: enriched.length,
      total,
      pages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      products: enriched
    });
  } catch (error) {
    next(error);
  }
};
// @desc    Get product counts grouped by category (for admin tabs)
// @route   GET /api/admin/products/counts
// @access  Private (Admin Only)
exports.getProductCountsByCategory = async (req, res, next) => {
  try {
    // Get every active or inactive product count per category
    const counts = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    // Fetch categories to map _id → slug
    const categories = await Category.find().select('_id slug name');

    // Build a map keyed by slug
    const bySlug = {};
    let totalAll = 0;

    for (const cat of categories) {
      bySlug[cat.slug] = 0;
    }

    for (const c of counts) {
      totalAll += c.count;
      const match = categories.find(
        (cat) => cat._id.toString() === c._id?.toString()
      );
      if (match) {
        bySlug[match.slug] = c.count;
      }
    }

    res.status(200).json({
      success: true,
      all: totalAll,
      byCategory: bySlug
    });
  } catch (error) {
    next(error);
  }
};
// ============================================================
// ADMIN MANAGEMENT (Super Admin only — guarded in routes)
// ============================================================

// @desc    List all admins (regular admins only — Super Admin is env-based)
// @route   GET /api/admin/admins
// @access  Private (Super Admin only)
exports.getAdmins = async (req, res, next) => {
  try {
    const admins = await User.find({ role: 'admin' })
      .select('-password')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: admins.length,
      admins
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new admin
// @route   POST /api/admin/admins
// @access  Private (Super Admin only)
exports.createAdmin = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    // Block creating an admin with the Super Admin email
    if (
      config.superAdminEmail &&
      normalizedEmail === config.superAdminEmail.toLowerCase().trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'This email is reserved for the Super Admin'
      });
    }

    // Check for existing user
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    // Create the admin — pre-save hook hashes password
    const admin = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password,
      role: 'admin'
    });

    logger.info('Admin created', {
      adminId: admin._id,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: `Admin "${admin.name}" created`,
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        createdAt: admin.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update an admin (name, email, password — all optional)
// @route   PUT /api/admin/admins/:id
// @access  Private (Super Admin only)
exports.updateAdmin = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const admin = await User.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    if (admin.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'This user is not an administrator'
      });
    }

    // Update name
    if (name && String(name).trim()) {
      admin.name = String(name).trim();
    }

    // Update email
    if (email) {
      const normalizedEmail = String(email).toLowerCase().trim();

      // Block using Super Admin's email
      if (
        config.superAdminEmail &&
        normalizedEmail === config.superAdminEmail.toLowerCase().trim()
      ) {
        return res.status(400).json({
          success: false,
          message: 'This email is reserved for the Super Admin'
        });
      }

      // Check no other user has this email
      const clash = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: admin._id }
      });
      if (clash) {
        return res.status(400).json({
          success: false,
          message: 'Another account already uses this email'
        });
      }

      admin.email = normalizedEmail;
    }

    // Update password (pre-save hook will hash it)
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters'
        });
      }
      admin.password = password;
    }

    await admin.save();

    logger.info('Admin updated', {
      adminId: admin._id,
      updatedBy: req.user._id
    });

    res.status(200).json({
      success: true,
      message: `Admin "${admin.name}" updated`,
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        createdAt: admin.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an admin
// @route   DELETE /api/admin/admins/:id
// @access  Private (Super Admin only)
exports.deleteAdmin = async (req, res, next) => {
  try {
    const admin = await User.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    if (admin.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'This user is not an administrator'
      });
    }

    // Safety: prevent deleting the LAST admin
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      return res.status(400).json({
        success: false,
        message:
          'Cannot delete the last admin. Create another admin first, or use the Super Admin account.'
      });
    }

    await User.findByIdAndDelete(admin._id);

    logger.info('Admin deleted', {
      adminId: admin._id,
      deletedBy: req.user._id
    });

    res.status(200).json({
      success: true,
      message: `Admin "${admin.name}" deleted`
    });
  } catch (error) {
    next(error);
  }
};