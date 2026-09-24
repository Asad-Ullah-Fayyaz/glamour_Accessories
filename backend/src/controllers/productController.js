const Product = require('../models/Product');
const Category = require('../models/Category');
const slugify = require('slugify');
const { PAGINATION, SEARCH } = require('../config/constants');
const { normalizeSaleFields } = require('../utils/pricing');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const generateUniqueSlug = async (baseSlug, excludeId = null) => {
  let slug = baseSlug;
  let counter = 1;
  // eslint-disable-next-line no-await-in-loop
  while (
    await Product.exists({
      slug,
      ...(excludeId ? { _id: { $ne: excludeId } } : {})
    })
  ) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
    if (counter > 100) {
      slug = `${baseSlug}-${Date.now().toString(36)}`;
      break;
    }
  }
  return slug;
};

const PLACEHOLDER_IMAGE = '/images/product-placeholder.svg';

const getActiveCategoryIds = async () => {
  const activeCats = await Category.find({ isActive: true }).select('_id');
  return activeCats.map((c) => c._id);
};

const buildCategoryPath = async (categoryId) => {
  if (!categoryId) return { l1: null, l2: null, l3: null };

  const path = { l1: null, l2: null, l3: null };
  let current = await Category.findById(categoryId).select('name slug level parent').lean();
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

  return path;
};

const attachCategoryPath = async (product) => {
  if (!product || !product.category) return product;
  const catId = product.category._id ? product.category._id : product.category;
  const path = await buildCategoryPath(catId);
  return { ...product, categoryPath: path };
};

const attachCategoryPathToMany = async (products) =>
  Promise.all(products.map((p) => attachCategoryPath(p)));

const getCategorySubtreeIds = async (category) => {
  const ids = [category._id];
  if (category.level === 1) {
    const l2 = await Category.find({ parent: category._id }).select('_id').lean();
    ids.push(...l2.map((c) => c._id));
    if (l2.length > 0) {
      const l3 = await Category.find({ parent: { $in: l2.map((c) => c._id) } })
        .select('_id')
        .lean();
      ids.push(...l3.map((c) => c._id));
    }
  } else if (category.level === 2) {
    const l3 = await Category.find({ parent: category._id }).select('_id').lean();
    ids.push(...l3.map((c) => c._id));
  }
  return ids;
};

// -------------------------------------------------------------------------
// PUBLIC
// -------------------------------------------------------------------------

exports.getProducts = async (req, res, next) => {
  try {
    const {
      search,
      category,
      minPrice,
      maxPrice,
      inStock,
      sort,
      page = 1,
      limit = PAGINATION.DEFAULT_LIMIT
    } = req.query;

    const activeCategoryIds = await getActiveCategoryIds();
    const query = { isActive: true, category: { $in: activeCategoryIds } };

    if (search) {
      const trimmed = escapeRegex(search.trim()).slice(0, SEARCH.MAX_LENGTH);
      const variants = new Set([trimmed]);
      if (trimmed.endsWith('es')) variants.add(trimmed.slice(0, -2));
      if (trimmed.endsWith('s')) variants.add(trimmed.slice(0, -1));

      const orConditions = [];
      for (const term of variants) {
        const rx = { $regex: term, $options: 'i' };
        orConditions.push({ name: rx }, { description: rx });
      }

      const matchingCategories = await Category.find({
        name: { $regex: trimmed, $options: 'i' },
        isActive: true
      }).select('_id');

      if (matchingCategories.length > 0) {
        orConditions.push({ category: { $in: matchingCategories.map((c) => c._id) } });
      }
      query.$or = orConditions;
    }

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
      query.category = { $in: await getCategorySubtreeIds(catObj) };
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (inStock === 'true') query.stock = { $gt: 0 };

    let sortOptions = { createdAt: -1 };
    if (sort === 'price-asc') sortOptions = { price: 1 };
    if (sort === 'price-desc') sortOptions = { price: -1 };
    if (sort === 'featured') sortOptions = { isFeatured: -1, createdAt: -1 };

    const pageNum = Math.min(Math.max(Number(page) || 1, 1), PAGINATION.MAX_PAGE);
    const limitNum = Math.min(
      Math.max(Number(limit) || PAGINATION.DEFAULT_LIMIT, 1),
      PAGINATION.MAX_LIMIT
    );
    const skip = (pageNum - 1) * limitNum;

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category', 'name slug level parent')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean();
    const enriched = await attachCategoryPathToMany(products);

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

exports.getFeaturedProducts = async (req, res, next) => {
  try {
    const activeCategoryIds = await getActiveCategoryIds();
    const products = await Product.find({
      isActive: true,
      isFeatured: true,
      category: { $in: activeCategoryIds }
    })
      .populate('category', 'name slug level parent')
      .limit(8)
      .sort('-createdAt')
      .lean();
    const enriched = await attachCategoryPathToMany(products);
    res.status(200).json({ success: true, count: enriched.length, products: enriched });
  } catch (error) {
    next(error);
  }
};

exports.getProductBySlug = async (req, res, next) => {
  try {
    const activeCategoryIds = await getActiveCategoryIds();
    const product = await Product.findOne({
      slug: req.params.slug,
      isActive: true,
      category: { $in: activeCategoryIds }
    })
      .populate('category', 'name slug level parent')
      .lean();

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.status(200).json({ success: true, product: await attachCategoryPath(product) });
  } catch (error) {
    next(error);
  }
};

exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name slug level parent')
      .lean();
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.status(200).json({ success: true, product: await attachCategoryPath(product) });
  } catch (error) {
    next(error);
  }
};

exports.getRelatedProducts = async (req, res, next) => {
  try {
    const currentProduct = await Product.findById(req.params.id);
    if (!currentProduct) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const activeCategoryIds = await getActiveCategoryIds();
    const assignedCategory = await Category.findById(currentProduct.category);
    const catIds = assignedCategory ? await getCategorySubtreeIds(assignedCategory) : [];
    const activeIds = catIds.filter((id) =>
      activeCategoryIds.some((activeId) => activeId.toString() === id.toString())
    );

    const related = await Product.find({
      _id: { $ne: currentProduct._id },
      isActive: true,
      category: { $in: activeIds }
    })
      .limit(4)
      .populate('category', 'name slug level parent')
      .lean();
    res.status(200).json({
      success: true,
      products: await attachCategoryPathToMany(related)
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------------------
// ADMIN CRUD
// -------------------------------------------------------------------------

exports.createProduct = async (req, res, next) => {
  try {
    const {
      name,
      description,
      price,
      stock,
      category,
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
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category (L1/L2/L3) is required'
      });
    }

    const catDoc = await Category.findById(category);
    if (!catDoc) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const slug = await generateUniqueSlug(slugify(name, { lower: true, strict: true }));
    const productData = {
      name,
      slug,
      description,
      price: Number(price),
      stock: Number(stock),
      category: catDoc._id,
      images: Array.isArray(images) && images.length > 0 ? images : [PLACEHOLDER_IMAGE],
      isFeatured: Boolean(isFeatured),
      isCustomizable: Boolean(isCustomizable),
      isOnSale: Boolean(isOnSale),
      newIs: Boolean(newIs),
      onSale: saleFields.onSale,
      previousPrice: saleFields.previousPrice
    };

    const normalizedSalePrice = Number(salePrice);
    if (
      salePrice !== undefined &&
      salePrice !== null &&
      salePrice !== '' &&
      Number.isFinite(normalizedSalePrice) &&
      normalizedSalePrice >= 0
    ) {
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
    const {
      name,
      description,
      price,
      stock,
      category,
      images,
      isFeatured,
      isActive,
      isCustomizable,
      isOnSale,
      salePrice,
      newIs
    } = req.body;
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
      updateData.slug = await generateUniqueSlug(
        slugify(name, { lower: true, strict: true }),
        req.params.id
      );
    }
    if (description !== undefined) updateData.description = description;
    if (price !== undefined && price !== '') updateData.price = Number(price);
    if (stock !== undefined && stock !== '') updateData.stock = Number(stock);

    if (category) {
      const catDoc = await Category.findById(category);
      if (!catDoc) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }
      updateData.category = catDoc._id;
    }

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

    const product = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.status(200).json({ success: true, product });
  } catch (error) {
    next(error);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.uploadImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload at least one image file'
      });
    }
    const imagePaths = req.files.map((file) => file.path);
    res.status(200).json({ success: true, images: imagePaths });
  } catch (error) {
    next(error);
  }
};
