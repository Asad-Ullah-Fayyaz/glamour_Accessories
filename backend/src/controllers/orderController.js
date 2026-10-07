const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const SiteContent = require('../models/SiteContent');
const generateOrderId = require('../utils/generateOrderId');
const { sendOrderConfirmationEmail } = require('../services/emailService');
const { sendCapiPurchaseEvent } = require('../services/metaCapiService');
const { SHIPPING } = require('../config/constants');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

const getEffectivePrice = (product) =>
  product && product.isOnSale && typeof product.salePrice === 'number' && product.salePrice >= 0
    ? product.salePrice
    : product.price;

// Helper to delete physical files
const deleteImages = (imagePaths) => {
  if (!imagePaths || !Array.isArray(imagePaths)) return;
  imagePaths.forEach((imgPath) => {
    const fullPath = path.join(__dirname, '../../', imgPath);
    if (fs.existsSync(fullPath)) {
      fs.unlink(fullPath, (err) => {
        if (err) logger.error(`Failed to delete image: ${fullPath}`, { error: err.message });
      });
    }
  });
};

// @desc    Place a new COD order (Supports Guests & Logged-in Users)
// @route   POST /api/orders
// @access  Public / Optional Auth
exports.createOrder = async (req, res, next) => {
  try {
    const { items, shippingAddress, customerEmail, orderNotes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No items in order' });
    }

    if (
      !shippingAddress ||
      !shippingAddress.fullName ||
      !shippingAddress.phone ||
      !shippingAddress.street ||
      !shippingAddress.city
    ) {
      return res
        .status(400)
        .json({ success: false, message: 'Complete shipping address is required' });
    }

    // Email is now OPTIONAL.
    // Prefer logged-in user email, then explicit customerEmail, then shippingAddress.email.
    // If none exists, store as empty string (consistent with optional string convention).
    const rawEmail = req.user?.email || customerEmail || shippingAddress?.email;
    const email = rawEmail ? String(rawEmail).toLowerCase().trim() : '';

    // ============================================================
    // 1) Load store settings (COD toggle + fee + threshold)
    // ============================================================
    const site = await SiteContent.findOne({ key: 'homepage' });
    const store = site?.store || {};

    const codEnabled = store.codEnabled !== false; // default: enabled

    if (!codEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Cash on Delivery is currently unavailable. Please try again later.'
      });
    }

    const codFee =
      typeof store.codFee === 'number' && store.codFee >= 0
        ? store.codFee
        : SHIPPING.STANDARD_SHIPPING_COST;

    const freeShippingThreshold =
      typeof store.freeShippingThreshold === 'number' && store.freeShippingThreshold >= 0
        ? store.freeShippingThreshold
        : SHIPPING.FREE_SHIPPING_THRESHOLD;
    // ============================================================

    let calculatedSubtotal = 0;
    const orderItemSnapshots = [];
    const reservedItems = [];

    // Atomically reserve stock for each item, rolling back if any item fails
    for (const item of items) {
      const productId = item.productId || item.product;
      const qty = Number(item.quantity);

      const product = await Product.findOneAndUpdate(
        {
          _id: productId,
          stock: { $gte: qty },
          isActive: true
        },
        {
          $inc: { stock: -qty }
        },
        {
          new: true
        }
      );

      if (!product) {
        for (const reserved of reservedItems) {
          // eslint-disable-next-line no-await-in-loop
          await Product.findByIdAndUpdate(reserved.productId, {
            $inc: { stock: reserved.quantity }
          });
        }

        const checkProd = await Product.findById(productId);
        const name = checkProd ? checkProd.name : item.name || 'Requested Item';
        return res.status(400).json({
          success: false,
          message: checkProd
            ? `Insufficient stock for '${name}'. Available: ${checkProd.stock}`
            : `Product '${name}' is no longer available.`
        });
      }

      reservedItems.push({ productId, quantity: qty });

      const sellingPrice = getEffectivePrice(product);

      // Build the order item snapshot
      const snapshot = {
        product: product._id,
        name: product.name,
        price: sellingPrice,
        quantity: qty,
        previousPrice: product.isOnSale ? product.price : undefined,
        isOnSaleAtPurchase: !!product.isOnSale,
        image:
          item.image ||
          (product.images && product.images.length > 0 ? product.images[0] : '')
      };

      // Carry customization through from the client request, if present.
      let lensPrice = 0;
      if (item.customization && typeof item.customization === 'object') {
        const desc =
          typeof item.customization.description === 'string'
            ? item.customization.description.trim().slice(0, 2000)
            : '';
        const img =
          typeof item.customization.prescriptionImage === 'string'
            ? item.customization.prescriptionImage.trim().slice(0, 2048)
            : '';

        // Lens option snapshot (optional)
        let lensOption;
        const rawLens = item.customization.lensOption;
        if (rawLens && typeof rawLens === 'object') {
          const lensName =
            typeof rawLens.name === 'string' ? rawLens.name.trim().slice(0, 80) : '';
          const lensDesc =
            typeof rawLens.description === 'string'
              ? rawLens.description.trim().slice(0, 500)
              : '';
          const rawLensPrice = Number(rawLens.price);
          const lensPriceValue =
            Number.isFinite(rawLensPrice) && rawLensPrice >= 0 ? rawLensPrice : 0;

          if (lensName) {
            lensOption = {
              name: lensName,
              description: lensDesc,
              price: lensPriceValue
            };
            lensPrice = lensPriceValue;
          }
        }

        if (desc || img || lensOption) {
          snapshot.customization = {
            description: desc,
            prescriptionImage: img
          };
          if (lensOption) {
            snapshot.customization.lensOption = lensOption;
          }
        }
      }

      // Line subtotal = (authoritative selling price + lens price) * qty
      calculatedSubtotal += (getEffectivePrice(product) + lensPrice) * qty;

      orderItemSnapshots.push(snapshot);
    }

    // ============================================================
    // 2) Compute final shipping cost + total
    // ============================================================
    const shippingCost = calculatedSubtotal >= freeShippingThreshold ? 0 : codFee;
    const totalAmount = calculatedSubtotal + shippingCost;
    // ============================================================

    // Sanitize phone number to standard 11-digit Pakistani format (03XXXXXXXXX)
    let sanitizedPhone = String(shippingAddress.phone || '').trim().replace(/\D/g, '');
    if (sanitizedPhone.startsWith('92') && sanitizedPhone.length === 12) {
      sanitizedPhone = '0' + sanitizedPhone.slice(2);
    }
    const sanitizedAddress = {
      ...shippingAddress,
      phone: sanitizedPhone
    };

    let order;
    try {
      order = await Order.create({
        orderId: generateOrderId(),
        customer: req.user ? req.user._id : null,
        customerEmail: email, // may be '' when no email is provided
        items: orderItemSnapshots,
        shippingAddress: sanitizedAddress,
        paymentMethod: 'COD',
        subtotal: calculatedSubtotal,
        shippingCost,
        totalAmount,
        status: 'Pending',
        ...(orderNotes
          ? { adminNotes: `Customer note: ${String(orderNotes).slice(0, 500)}` }
          : {})
      });
    } catch (createErr) {
      for (const reserved of reservedItems) {
        // eslint-disable-next-line no-await-in-loop
        await Product.findByIdAndUpdate(reserved.productId, {
          $inc: { stock: reserved.quantity }
        });
      }
      throw createErr;
    }

    // Clear cart if customer was logged in
    if (req.user) {
      await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });
    }

    // Trigger Meta Conversions API (CAPI) Purchase Event asynchronously (non-blocking)
    const { fbp, fbc } = req.body || {};
    sendCapiPurchaseEvent({
      order,
      req,
      fbp,
      fbc
    }).catch((capiErr) => {
      logger.error('CAPI Purchase dispatch error:', { error: capiErr.message });
    });

    // Send confirmation email only when an email is actually available.
    // Non-blocking failure: order creation must not fail because of email issues.
    if (order.customerEmail) {
      try {
        await sendOrderConfirmationEmail(order);
      } catch (emailErr) {
        logger.error('Order email dispatch failed:', {
          orderId: order.orderId,
          error: emailErr.message
        });
      }
    }

    return res.status(201).json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/my-orders
// @access  Private
exports.getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ customer: req.user._id }).sort('-createdAt');
    res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get order details by orderId
// @route   GET /api/orders/:orderId
// @access  Private
exports.getOrderByOrderId = async (req, res, next) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (
      order.customer &&
      order.customer.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to view this order'
      });
    }

    res.status(200).json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

// @desc    Public order tracking lookup
// @route   POST /api/orders/track
// @access  Public
exports.trackOrderPublic = async (req, res, next) => {
  try {
    const { orderId, emailOrPhone } = req.body;

    if (!orderId) {
      return res
        .status(400)
        .json({ success: false, message: 'Order Reference ID is required' });
    }

    const order = await Order.findOne({ orderId: orderId.trim() });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'No matching order found for this reference ID.'
      });
    }

    if (emailOrPhone) {
      const queryStr = emailOrPhone.trim().toLowerCase();
      const orderEmail = (order.customerEmail || '').toLowerCase();
      const emailMatches = orderEmail !== '' && orderEmail === queryStr;

      const digitsOnly = (s) => (s || '').replace(/\D/g, '');
      const phoneMatches =
        digitsOnly(order.shippingAddress?.phone).length >= 7 &&
        digitsOnly(order.shippingAddress?.phone).endsWith(digitsOnly(queryStr).slice(-7)) &&
        digitsOnly(queryStr).length >= 7;

      if (!emailMatches && !phoneMatches) {
        return res.status(400).json({
          success: false,
          message:
            'Security check failed. The email or phone number provided does not match our records for this order.'
        });
      }
    }

    res.status(200).json({
      success: true,
      tracking: {
        orderId: order.orderId,
        status: order.status,
        createdAt: order.createdAt,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        courierInfo: order.courierInfo,
        itemCount: order.items.length,
        cityName: order.shippingAddress.city
      }
    });
  } catch (error) {
    next(error);
  }
};