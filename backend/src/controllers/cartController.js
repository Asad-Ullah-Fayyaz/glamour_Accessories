const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { ORDER } = require('../config/constants');
const logger = require('../utils/logger');

const getEffectivePrice = (product) =>
  product && product.isOnSale && typeof product.salePrice === 'number' && product.salePrice >= 0
    ? product.salePrice
    : product.price;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Sanitize a lens option coming from the client.
// Returns { name, description, price } or undefined.
const sanitizeLensOption = (raw) => {
  if (!raw || typeof raw !== 'object') return undefined;

  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 80) : '';
  const description =
    typeof raw.description === 'string' ? raw.description.trim().slice(0, 500) : '';
  const rawPrice = Number(raw.price);
  const price = Number.isFinite(rawPrice) && rawPrice >= 0 ? rawPrice : 0;

  // A lens option MUST have a name to be valid
  if (!name) return undefined;

  return { name, description, price };
};

// Sanitize a customization object coming from a client.
// Returns a clean { description, prescriptionImage, lensOption } or undefined.
const sanitizeCustomization = (raw) => {
  if (!raw || typeof raw !== 'object') return undefined;

  const description =
    typeof raw.description === 'string' ? raw.description.trim().slice(0, 2000) : '';
  const prescriptionImage =
    typeof raw.prescriptionImage === 'string' ? raw.prescriptionImage.trim().slice(0, 2048) : '';
  const lensOption = sanitizeLensOption(raw.lensOption);

  if (!description && !prescriptionImage && !lensOption) return undefined;

  const result = { description, prescriptionImage };
  if (lensOption) result.lensOption = lensOption;
  return result;
};

// Two customizations match when product + all customization fields are identical.
// Used ONLY in addItem and mergeCart to decide whether to merge or create a new line.
const customizationsMatch = (a, b) => {
  const aDesc = (a && a.description) || '';
  const bDesc = (b && b.description) || '';
  const aImg = (a && a.prescriptionImage) || '';
  const bImg = (b && b.prescriptionImage) || '';

  // Lens option — compare all three fields (or both undefined)
  const aLens = a && a.lensOption;
  const bLens = b && b.lensOption;
  const lensMatch = (() => {
    if (!aLens && !bLens) return true;
    if (!aLens || !bLens) return false;
    return (
      (aLens.name || '') === (bLens.name || '') &&
      (aLens.description || '') === (bLens.description || '') &&
      Number(aLens.price || 0) === Number(bLens.price || 0)
    );
  })();

  return aDesc === bDesc && aImg === bImg && lensMatch;
};

// Validation: if the customer provided a prescription (text or image),
// they MUST select a lens option.
// Returns null if OK, or an error message string.
// Validation: prescription and lens must be provided together.
// Either both are present, or neither is present.
// Returns null if OK, or an error message string.
const validatePrescriptionRequiresLens = (customization) => {
  if (!customization) return null;

  const hasPrescription =
    (customization.description && customization.description.length > 0) ||
    (customization.prescriptionImage && customization.prescriptionImage.length > 0);

  const hasLens = !!customization.lensOption;

  // Case 1: prescription provided but no lens
  if (hasPrescription && !hasLens) {
    return 'Please select a lens type for your prescription';
  }

  // Case 2: lens provided but no prescription
  if (hasLens && !hasPrescription) {
    return 'Please provide your prescription to continue with a lens selection';
  }

  return null;
};

// Compute line total: (product price + lens price) * quantity
const computeItemTotal = (productPrice, quantity, customization) => {
  const lensPrice = customization && customization.lensOption
    ? Number(customization.lensOption.price) || 0
    : 0;
  return (productPrice + lensPrice) * quantity;
};

// Build the cart response that the frontend consumes.
// Each item includes its unique `lineId`, customization (with lensOption),
// and a lineTotal that already accounts for the lens price.
const formatCartResponse = async (cart) => {
  if (!cart) {
    return { _id: null, user: null, items: [], itemCount: 0, subtotal: 0 };
  }

  let subtotal = 0;
  const validatedItems = [];

  for (const item of cart.items) {
    const product = await Product.findById(item.product).populate('category', 'name slug');
    if (product && product.isActive) {
      const validQty = Math.min(item.quantity, product.stock);

      // Line total accounts for the lens price
      const itemTotal = computeItemTotal(getEffectivePrice(product), validQty, item.customization);
      subtotal += itemTotal;

      const shaped = {
        lineId: item._id ? item._id.toString() : null,
        product: {
          _id: product._id,
          name: product.name,
          slug: product.slug,
          price: product.price,
          salePrice: product.salePrice ?? null,
          isOnSale: !!product.isOnSale,
          newIs: !!product.newIs,
          onSale: product.onSale === true,
          previousPrice: product.previousPrice || null,
          stock: product.stock,
          images: product.images,
          category: product.category,
          isCustomizable: !!product.isCustomizable
        },
        quantity: validQty,
        itemTotal
      };

      if (item.customization) {
        const c = item.customization;
        shaped.customization = {
          description: c.description || '',
          prescriptionImage: c.prescriptionImage || ''
        };
        if (c.lensOption) {
          shaped.customization.lensOption = {
            name: c.lensOption.name || '',
            description: c.lensOption.description || '',
            price: Number(c.lensOption.price) || 0
          };
        }
      }

      validatedItems.push(shaped);
    }
  }

  return {
    _id: cart._id || null,
    user: cart.user || null,
    items: validatedItems,
    itemCount: validatedItems.reduce((acc, item) => acc + item.quantity, 0),
    subtotal
  };
};

// ---------------------------------------------------------------------------
// Controllers
// ---------------------------------------------------------------------------

// @desc    Get current user's cart
// @route   GET /api/cart
// @access  Private
exports.getCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = await Cart.create({ user: req.user.id, items: [] });
    }
    const formattedCart = await formatCartResponse(cart);
    res.status(200).json({ success: true, cart: formattedCart });
  } catch (error) {
    next(error);
  }
};

// @desc    Add product to cart
// @route   POST /api/cart/add
// @access  Private
exports.addItem = async (req, res, next) => {
  try {
    const { productId, quantity = 1, customization: rawCustomization } = req.body;
    const qty = Math.min(Number(quantity) || 1, ORDER.MAX_QTY_PER_ITEM);

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: 'Product is unavailable' });
    }
    if (product.stock < 1) {
      return res.status(400).json({ success: false, message: 'Product is currently out of stock' });
    }

    const customization = sanitizeCustomization(rawCustomization);
    const finalCustomization = product.isCustomizable ? customization : undefined;

    // Validation: prescription requires a lens option
    const validationError = validatePrescriptionRequiresLens(finalCustomization);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = await Cart.create({ user: req.user.id, items: [] });
    }

    const existingIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        customizationsMatch(item.customization, finalCustomization)
    );

    if (existingIndex > -1) {
      const newQty = cart.items[existingIndex].quantity + qty;
      if (newQty > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Cannot add more than ${product.stock} units available in stock`
        });
      }
      cart.items[existingIndex].quantity = newQty;
    } else {
      if (qty > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Cannot add more than ${product.stock} units available in stock`
        });
      }
      const newItem = { product: productId, quantity: qty };
      if (finalCustomization) newItem.customization = finalCustomization;
      cart.items.push(newItem);
    }

    await cart.save();
    const formattedCart = await formatCartResponse(cart);
    res.status(200).json({ success: true, cart: formattedCart });
  } catch (error) {
    next(error);
  }
};

// @desc    Update quantity of a specific cart line
// @route   PUT /api/cart/update
// @access  Private
// Body: { lineId, quantity }
exports.updateQuantity = async (req, res, next) => {
  try {
    const { lineId, quantity } = req.body;

    if (!lineId) {
      return res.status(400).json({ success: false, message: 'Missing lineId' });
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({ success: false, message: 'Quantity must be a positive integer' });
    }

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    const lineIndex = cart.items.findIndex(
      (item) => item._id && item._id.toString() === lineId
    );
    if (lineIndex === -1) {
      return res.status(404).json({ success: false, message: 'Cart line not found' });
    }

    const product = await Product.findById(cart.items[lineIndex].product);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product no longer exists' });
    }

    if (qty > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} units available in stock`
      });
    }

    cart.items[lineIndex].quantity = qty;
    await cart.save();

    const formattedCart = await formatCartResponse(cart);
    res.status(200).json({ success: true, cart: formattedCart });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove a specific cart line by its unique ID
// @route   DELETE /api/cart/item/:lineId
// @access  Private
exports.removeItem = async (req, res, next) => {
  try {
    const { lineId } = req.params;

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(200).json({
        success: true,
        cart: { _id: null, user: req.user.id, items: [], itemCount: 0, subtotal: 0 }
      });
    }

    if (lineId === 'legacy' && req.body && req.body.productId) {
      const { productId } = req.body;
      let removed = false;
      cart.items = cart.items.filter((item) => {
        if (!removed && item.product.toString() === productId) {
          removed = true;
          return false;
        }
        return true;
      });
    } else {
      cart.items = cart.items.filter(
        (item) => !(item._id && item._id.toString() === lineId)
      );
    }

    await cart.save();
    const formattedCart = await formatCartResponse(cart);
    res.status(200).json({ success: true, cart: formattedCart });
  } catch (error) {
    next(error);
  }
};

// @desc    Merge a guest cart into the user's server cart after login
// @route   POST /api/cart/merge
// @access  Private
exports.mergeCart = async (req, res, next) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      const existing = await Cart.findOne({ user: req.user.id });
      return res.status(200).json({ success: true, cart: await formatCartResponse(existing) });
    }

    if (items.length > 50) {
      return res.status(400).json({ success: false, message: 'Too many items to merge' });
    }

    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) cart = await Cart.create({ user: req.user.id, items: [] });

    const mergeResults = { merged: 0, rejected: [] };

    for (const entry of items) {
      const productId = entry && entry.productId;
      const qty = Number(entry && entry.quantity);

      if (!productId || !Number.isInteger(qty) || qty < 1 || qty > ORDER.MAX_QTY_PER_ITEM) {
        mergeResults.rejected.push({ productId, reason: 'Invalid item or quantity' });
        continue;
      }

      const product = await Product.findById(productId);
      if (!product || !product.isActive || product.stock < 1) {
        mergeResults.rejected.push({ productId, reason: 'Product unavailable or out of stock' });
        continue;
      }

      const incomingCustomization = sanitizeCustomization(entry.customization);
      const finalCustomization = product.isCustomizable ? incomingCustomization : undefined;

      // Same validation as addItem
      const validationError = validatePrescriptionRequiresLens(finalCustomization);
      if (validationError) {
        mergeResults.rejected.push({ productId, reason: validationError });
        continue;
      }

      const existingIndex = cart.items.findIndex(
        (i) =>
          i.product.toString() === productId &&
          customizationsMatch(i.customization, finalCustomization)
      );

      if (existingIndex > -1) {
        const maxQty = Math.min(
          Math.max(cart.items[existingIndex].quantity, qty),
          product.stock
        );
        cart.items[existingIndex].quantity = maxQty;
      } else {
        const newItem = {
          product: productId,
          quantity: Math.min(qty, product.stock)
        };
        if (finalCustomization) newItem.customization = finalCustomization;
        cart.items.push(newItem);
      }
      mergeResults.merged += 1;
    }

    await cart.save();
    const formattedCart = await formatCartResponse(cart);

    logger.info('Guest cart merged', {
      userId: req.user.id,
      merged: mergeResults.merged,
      rejected: mergeResults.rejected.length
    });

    res.status(200).json({ success: true, cart: formattedCart, merge: mergeResults });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear entire cart
// @route   DELETE /api/cart/clear
// @access  Private
exports.clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (cart) {
      cart.items = [];
      await cart.save();
    }
    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      cart: { _id: null, user: req.user.id, items: [], itemCount: 0, subtotal: 0 }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload a prescription image to Cloudinary
// @route   POST /api/cart/prescription-upload
// @access  Public
exports.uploadPrescription = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a prescription image'
      });
    }

    const url = req.file.path;
    if (!url || typeof url !== 'string') {
      return res.status(500).json({
        success: false,
        message: 'Prescription upload succeeded but no URL was returned'
      });
    }

    res.status(200).json({ success: true, url });
  } catch (error) {
    next(error);
  }
};