const Product = require('../models/Product');
const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const slugify = require('slugify');
const { PAGINATION, SEARCH } = require('../config/constants');
const { normalizeSaleFields } = require('../utils/pricing');

// Escape user input before using it in $regex (prevents regex injection / ReDoS)
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Generate a unique slug by appending a counter suffix if needed
const generateUniqueSlug = async (baseSlug, excludeId = null) => {
  let slug = baseSlug;
  let counter = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await Product.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
    if (counter > 100) {
      // extreme fallback — practically unreachable
      slug = `${baseSlug}-${Date.now().toString(36)}`;
      break;
    }
  }
  return slug;
};

// Controlled local placeholder for products without images (no external random URLs)
const PLACEHOLDER_IMAGE = '/images/product-placeholder.svg';

// Helper — returns the _id list of active categories. Used to exclude products
// whose category has been disabled by the admin.
const getActiveCategoryIds = async () => {
  const activeCats = await Category.find({ isActive: true }).select('_id');
  return activeCats.map((c) => c._id);
};

// @desc    Get all catalog products with search, filters, sorting & pagination
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res, next) => {
  try {
    const {
      search,
      category,
      subCategory,
      minPrice,
      maxPrice,
      inStock,
      sort,
      page = 1,
      limit = PAGINATION.DEFAULT_LIMIT
    } = req.query;

    const activeCategoryIds = await getActiveCategoryIds();

    const query = {
      isActive: true,
      category: { $in: activeCategoryIds }
    };

    // ============================================================
    // SEARCH — matches name, description, AND category name
    // Also handles simple pluralization ("watches" → "watch")
    // ============================================================
    if (search) {
      const trimmed = escapeRegex(search.trim()).slice(0, SEARCH.MAX_LENGTH);

      // Build term variants so "watches" also matches "watch", "caps" → "cap", etc.
      const variants = new Set([trimmed]);
      if (trimmed.endsWith('es')) variants.add(trimmed.slice(0, -2));
      if (trimmed.endsWith('s')) variants.add(trimmed.slice(0, -1));

      const orConditions = [];
      for (const term of variants) {
        const rx = { $regex: term, $options: 'i' };
        orConditions.push({ name: rx }, { description: rx });
      }

      // Also match products whose category name matches the search term
      // (but only active categories)
      const matchingCategories = await Category.find({
        name: { $regex: trimmed, $options: 'i' },
        isActive: true
      }).select('_id');

      if (matchingCategories.length > 0) {
        orConditions.push({
          category: { $in: matchingCategories.map((c) => c._id) }
        });
      }

      query.$or = orConditions;
    }
    // ============================================================

    // Category filter by slug — disabled categories return EMPTY results
    if (category) {
      const catObj = await Category.findOne({ slug: category, isActive: true });
      if (!catObj) {
        return res.status(200).json({
          success: true,
          count: 0,
          total: 0,
          pages: 0,
          currentPage: Number(page),
          products: []
        });
      }
      query.category = catObj._id;
    }

    // SubCategory filter by slug
    if (subCategory) {
      const subCatObj = await SubCategory.findOne({ slug: subCategory, isActive: true });
      if (!subCatObj) {
        return res.status(200).json({
          success: true,
          count: 0,
          total: 0,
          pages: 0,
          currentPage: Number(page),
          products: []
        });
      }
      query.subCategory = subCatObj._id;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // In-Stock availability filter
    if (inStock === 'true') {
      query.stock = { $gt: 0 };
    }

    // Sort options (whitelist enforced by validator; defense in depth)
    let sortOptions = { createdAt: -1 }; // default newest
    if (sort === 'price-asc') sortOptions = { price: 1 };
    if (sort === 'price-desc') sortOptions = { price: -1 };
    if (sort === 'featured') sortOptions = { isFeatured: -1, createdAt: -1 };

    // Clamp pagination — never allow huge datasets
    const pageNum = Math.min(Math.max(Number(page) || 1, 1), PAGINATION.MAX_PAGE);
    const limitNum = Math.min(Math.max(Number(limit) || PAGINATION.DEFAULT_LIMIT, 1), PAGINATION.MAX_LIMIT);
    const skip = (pageNum - 1) * limitNum;

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category', 'name slug')
      .populate('subCategory', 'name slug')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      pages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      products
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
exports.getFeaturedProducts = async (req, res, next) => {
  try {
    const activeCategoryIds = await getActiveCategoryIds();

    const products = await Product.find({
      isActive: true,
      isFeatured: true,
      category: { $in: activeCategoryIds }
    })
      .populate('category', 'name slug')
      .populate('subCategory', 'name slug')
      .limit(8)
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get product details by slug
// @route   GET /api/products/:slug
// @access  Public
exports.getProductBySlug = async (req, res, next) => {
  try {
    const activeCategoryIds = await getActiveCategoryIds();

    const product = await Product.findOne({
      slug: req.params.slug,
      isActive: true,
      category: { $in: activeCategoryIds }
    })
      .populate('category', 'name slug')
      .populate('subCategory', 'name slug');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get related products in same category
// @route   GET /api/products/:id/related
// @access  Public
exports.getRelatedProducts = async (req, res, next) => {
  try {
    const currentProduct = await Product.findById(req.params.id);
    if (!currentProduct) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const activeCategoryIds = await getActiveCategoryIds();

    // Recommend primarily from same sub-category, falling back to same category
    let related = [];
    if (currentProduct.subCategory) {
      related = await Product.find({
        subCategory: currentProduct.subCategory,
        _id: { $ne: currentProduct._id },
        isActive: true,
        category: { $in: activeCategoryIds }
      })
        .limit(4)
        .populate('category', 'name slug');
    }

    if (related.length < 4) {
      const excludeIds = [currentProduct._id, ...related.map((r) => r._id)];

      // Only fall back to category if the parent category is active
      const catIsActive = activeCategoryIds.some(
        (id) => id.toString() === currentProduct.category?.toString()
      );

      const categoryFallback = catIsActive
        ? await Product.find({
            category: currentProduct.category,
            _id: { $nin: excludeIds },
            isActive: true
          })
            .limit(4 - related.length)
            .populate('category', 'name slug')
        : [];

      related = [...related, ...categoryFallback];
    }

    res.status(200).json({
      success: true,
      products: related
    });
  } catch (error) {
    next(error);
  }
};

// --- ADMIN PRODUCT CRUD ---
// (unchanged — admin must still see products in disabled categories)

exports.createProduct = async (req, res, next) => {
  try {
    const {
      name,
      description,
      price,
      stock,
      category,
      subCategory,
      images,
      isFeatured,
      isCustomizable,
      isOnSale,
      salePrice,
      newIs
    } = req.body;

    const saleFields = normalizeSaleFields(req.body);
    if (saleFields.error) {
      return res.status(400).json({ success: false, message: saleFields.error });
    }

    const baseSlug = slugify(name, { lower: true, strict: true });
    const slug = await generateUniqueSlug(baseSlug);

    const productData = {
      name,
      slug,
      description,
      price: Number(price),
      stock: Number(stock),
      category,
      subCategory: subCategory || null,
      images: Array.isArray(images) && images.length > 0 ? images : [PLACEHOLDER_IMAGE],
      isFeatured: Boolean(isFeatured),
      isCustomizable: Boolean(isCustomizable),
      isOnSale: Boolean(isOnSale),
      newIs: Boolean(newIs),
      onSale: saleFields.onSale,
      previousPrice: saleFields.previousPrice
    };

    const normalizedSalePrice = Number(salePrice);
    if (salePrice !== undefined && salePrice !== null && salePrice !== '' && Number.isFinite(normalizedSalePrice) && normalizedSalePrice >= 0) {
      productData.salePrice = normalizedSalePrice;
    }

    const product = await Product.create(productData);

    res.status(201).json({ success: true, product });
  } catch (error) {
    next(error);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    
const { name, description, price, stock, category, subCategory, images, isFeatured, isActive, isCustomizable, isOnSale, salePrice, newIs } = req.body;
    const updateData = {};
    if (req.body.onSale !== undefined || req.body.previousPrice !== undefined) {
      const existingProduct = await Product.findById(req.params.id).select('price');
      const saleFields = normalizeSaleFields({
        onSale: req.body.onSale,
        previousPrice: req.body.previousPrice,
        price: price !== undefined && price !== '' ? price : existingProduct?.price
      });
      if (saleFields.error) {
        return res.status(400).json({ success: false, message: saleFields.error });
      }
      updateData.onSale = saleFields.onSale;
      updateData.previousPrice = saleFields.previousPrice;
    }
    if (name) {
      updateData.name = name;
      // Ensure the new slug is unique (excluding this product itself)
      updateData.slug = await generateUniqueSlug(
        slugify(name, { lower: true, strict: true }),
        req.params.id
      );
    }
    if (description !== undefined) updateData.description = description;
    if (price !== undefined && price !== '') updateData.price = Number(price);
    if (stock !== undefined && stock !== '') updateData.stock = Number(stock);
    if (category) updateData.category = category;
    if (subCategory !== undefined) updateData.subCategory = subCategory || null;
    if (images && Array.isArray(images)) updateData.images = images;
    if (isFeatured !== undefined) updateData.isFeatured = Boolean(isFeatured);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
     if (isCustomizable !== undefined) updateData.isCustomizable = Boolean(isCustomizable);
    if (isOnSale !== undefined) updateData.isOnSale = Boolean(isOnSale);
    if (newIs !== undefined) updateData.newIs = Boolean(newIs);
    if (salePrice !== undefined && salePrice !== null && salePrice !== '') {
      const normalizedSalePrice = Number(salePrice);
      if (Number.isFinite(normalizedSalePrice) && normalizedSalePrice >= 0) {
        updateData.salePrice = normalizedSalePrice;
      }
    }

    const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    res.status(200).json({ success: true, product });
  } catch (error) {
    next(error);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.uploadImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'Please upload at least one image file' });
    }

 // Cloudinary returns the full HTTPS URL in file.path
    const imagePaths = req.files.map(file => file.path);
    res.status(200).json({ success: true, images: imagePaths });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product by MongoDB _id (admin use)
// @route   GET /api/products/id/:id
// @access  Public (or admin — your choice)
exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name slug')
      .populate('subCategory', 'name slug');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.status(200).json({ success: true, product });
  } catch (error) {
    next(error);
  }
};