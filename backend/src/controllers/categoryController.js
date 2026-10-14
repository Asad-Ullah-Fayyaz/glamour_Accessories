const mongoose = require('mongoose');
const Category = require('../models/Category');
const Product = require('../models/Product');
const slugify = require('slugify');

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Validate a proposed parent for a new/updated category.
// Returns null if OK, or an error string.
const validateParent = async (parentId, expectedLevel) => {
  if (expectedLevel === 1) {
    if (parentId) return 'Level 1 categories cannot have a parent';
    return null;
  }

  if (!parentId) {
    return `Level ${expectedLevel} categories require a parent category`;
  }

  const parent = await Category.findById(parentId);
  if (!parent) return 'Parent category not found';

  const requiredParentLevel = expectedLevel - 1;
  if (parent.level !== requiredParentLevel) {
    return `Level ${expectedLevel} categories must have a Level ${requiredParentLevel} parent`;
  }

  return null;
};

// Generate a unique slug (append counter if taken).
const generateUniqueSlug = async (baseSlug, excludeId = null) => {
  let slug = baseSlug;
  let counter = 1;
  // eslint-disable-next-line no-await-in-loop
  while (
    await Category.exists({
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

const findSiblingName = async (name, level, parentId, excludeId = null) => {
  const query = {
    level,
    parent: parentId || null,
    name: new RegExp(`^${escapeRegex(name.trim())}$`, 'i'),
    ...(excludeId ? { _id: { $ne: excludeId } } : {})
  };
  return Category.findOne(query);
};

const isSiblingNameDuplicate = (error) => {
  if (error.code !== 11000) return false;
  const pattern = error.keyPattern || {};
  return (
    JSON.stringify(Object.keys(pattern).sort()) ===
      JSON.stringify(['level', 'name', 'parent']) ||
    /index:\s+category_sibling_name_unique\b/.test(error.message || '')
  );
};

const isSlugDuplicate = (error) =>
  error.code === 11000 &&
  ((error.keyPattern && Object.keys(error.keyPattern).length === 1 && error.keyPattern.slug) ||
    (error.keyValue && Object.keys(error.keyValue).length === 1 && error.keyValue.slug) ||
    /index:\s+slug_1\b/.test(error.message || ''));

const createWithUniqueSlug = async (categoryData) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    categoryData.slug = await generateUniqueSlug(
      slugify(categoryData.name, { lower: true, strict: true })
    );
    try {
      // The global slug index remains for compatibility with existing slug URLs.
      // eslint-disable-next-line no-await-in-loop
      return await Category.create(categoryData);
    } catch (error) {
      if (!isSlugDuplicate(error) || attempt === 4) throw error;
    }
  }
  throw new Error('Unable to generate a unique category slug');
};

const saveWithUniqueSlug = async (category, baseSlug) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    category.slug = await generateUniqueSlug(baseSlug, category._id);
    try {
      // eslint-disable-next-line no-await-in-loop
      return await category.save();
    } catch (error) {
      if (!isSlugDuplicate(error) || attempt === 4) throw error;
    }
  }
  throw new Error('Unable to generate a unique category slug');
};

// Build a recursive tree from a flat list of categories.
// Root = level 1. Each node gets a `children` array (level 2 under level 1,
// level 3 under level 2). Products counts are attached separately by callers.
const buildTree = (flatCategories) => {
  const byId = {};
  const roots = [];

  flatCategories.forEach((cat) => {
    byId[cat._id.toString()] = { ...cat, children: [] };
  });

  flatCategories.forEach((cat) => {
    const node = byId[cat._id.toString()];
    if (!cat.parent) {
      roots.push(node);
    } else {
      const parentKey = cat.parent.toString();
      if (byId[parentKey]) {
        byId[parentKey].children.push(node);
      }
    }
  });

  return roots;
};

// -------------------------------------------------------------------------
// PUBLIC ENDPOINTS
// -------------------------------------------------------------------------

// @desc    Get active category tree (3 levels)
// @route   GET /api/categories
// @access  Public
exports.getCategories = async (req, res, next) => {
  try {
    const flat = await Category.find({ isActive: true })
      .sort({ level: 1, name: 1 })
      .lean();

    const tree = buildTree(flat);

    res.status(200).json({
      success: true,
      count: tree.length,
      categories: tree
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a category by slug, with its descendants
// @route   GET /api/categories/:slug
// @access  Public
exports.getCategoryBySlug = async (req, res, next) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug }).lean();
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Fetch all descendants (2 levels down max).
    let descendants = [];
    if (category.level === 1) {
      const l2 = await Category.find({ parent: category._id, isActive: true }).lean();
      const l2Ids = l2.map((c) => c._id);
      const l3 = await Category.find({ parent: { $in: l2Ids }, isActive: true }).lean();
      descendants = [...l2, ...l3];
    } else if (category.level === 2) {
      descendants = await Category.find({ parent: category._id, isActive: true }).lean();
    }

    // Build a subtree rooted at this category.
    const subtree = buildTree([category, ...descendants]);

    res.status(200).json({
      success: true,
      category,
      subCategories: subtree[0] ? subtree[0].children : []
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------------------
// ADMIN ENDPOINTS
// -------------------------------------------------------------------------

// @desc    Create a new category (any level)
// @route   POST /api/categories
// @access  Private (Admin)
// Body: { name, description?, image?, parent? }
// - No parent  → L1
// - Parent L1  → L2
// - Parent L2  → L3
exports.createCategory = async (req, res, next) => {
  try {
    const { name, description, image, parent, level: requestedLevel } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    // Determine level from parent.
    let level = 1;
    let parentId = null;

    if (parent) {
      if (!mongoose.isValidObjectId(parent)) {
        return res.status(400).json({
          success: false,
          message: 'Parent must be a valid category id'
        });
      }
      const parentDoc = await Category.findById(parent);
      if (!parentDoc) {
        return res.status(404).json({ success: false, message: 'Parent category not found' });
      }
      if (parentDoc.level >= 3) {
        return res.status(400).json({
          success: false,
          message: 'Cannot nest deeper than 3 levels (L1 → L2 → L3)'
        });
      }
      level = parentDoc.level + 1;
      parentId = parentDoc._id;
    }

    if (requestedLevel !== undefined && Number(requestedLevel) !== level) {
      let expectedParentMessage;
      if (Number(requestedLevel) === 1) {
        expectedParentMessage = 'Level 1 categories cannot have a parent';
      } else if (!parentId) {
        expectedParentMessage = `Level ${requestedLevel} categories require a parent category`;
      } else {
        expectedParentMessage = `Level ${requestedLevel} categories must have a Level ${Number(requestedLevel) - 1} parent`;
      }
      return res.status(400).json({
        success: false,
        message: expectedParentMessage
      });
    }

    const parentError = await validateParent(parentId, level);
    if (parentError) {
      return res.status(400).json({ success: false, message: parentError });
    }

    const normalizedName = name.trim();
    if (await findSiblingName(normalizedName, level, parentId)) {
      return res.status(409).json({
        success: false,
        message: `A category named "${normalizedName}" already exists under this parent`
      });
    }

    const category = await createWithUniqueSlug({
      name: normalizedName,
      description: typeof description === 'string' ? description.trim() : '',
      image: typeof image === 'string' ? image : '',
      parent: parentId,
      level
    });

    res.status(201).json({ success: true, category });
  } catch (error) {
    if (isSiblingNameDuplicate(error)) {
      return res.status(409).json({
        success: false,
        message: 'A category with this name already exists under this parent'
      });
    }
    if (isSlugDuplicate(error)) {
      return res.status(409).json({
        success: false,
        message: 'Unable to generate a unique category URL. Please try again.'
      });
    }
    next(error);
  }
};

// @desc    Update a category (name / description / image / isActive)
// @route   PUT /api/categories/:id
// @access  Private (Admin)
// NOTE: parent is intentionally NOT editable here. Re-parenting a category
// would require cascade re-leveling of all its descendants. To move a
// category, delete it (with no products attached) and recreate it.
exports.updateCategory = async (req, res, next) => {
  try {
    const { name, description, image, isActive } = req.body;
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    let slugBase = null;
    if (name && name.trim()) {
      const normalizedName = name.trim();
      if (await findSiblingName(normalizedName, category.level, category.parent, category._id)) {
        return res.status(409).json({
          success: false,
          message: `A category named "${normalizedName}" already exists under this parent`
        });
      }
      category.name = normalizedName;
      slugBase = slugify(normalizedName, { lower: true, strict: true });
    }
    if (description !== undefined) category.description = String(description).trim();
    if (image !== undefined) category.image = String(image);
    if (isActive !== undefined) category.isActive = Boolean(isActive);

    if (slugBase) {
      await saveWithUniqueSlug(category, slugBase);
    } else {
      await category.save();
    }

    res.status(200).json({ success: true, category });
  } catch (error) {
    if (isSiblingNameDuplicate(error)) {
      return res.status(409).json({
        success: false,
        message: 'A category with this name already exists under this parent'
      });
    }
    if (isSlugDuplicate(error)) {
      return res.status(409).json({
        success: false,
        message: 'Unable to generate a unique category URL. Please try again.'
      });
    }
    next(error);
  }
};

// @desc    Delete a category and all its descendants
// @route   DELETE /api/categories/:id
// @access  Private (Admin)
// Safety: refuses if ANY category in the subtree has products assigned.
exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Collect the entire subtree (self + descendants).
    const subtreeIds = [category._id];

    if (category.level === 1) {
      const l2 = await Category.find({ parent: category._id }).select('_id').lean();
      const l2Ids = l2.map((c) => c._id);
      subtreeIds.push(...l2Ids);
      if (l2Ids.length > 0) {
        const l3 = await Category.find({ parent: { $in: l2Ids } }).select('_id').lean();
        subtreeIds.push(...l3.map((c) => c._id));
      }
    } else if (category.level === 2) {
      const l3 = await Category.find({ parent: category._id }).select('_id').lean();
      subtreeIds.push(...l3.map((c) => c._id));
    }

    // Refuse if any product is attached to any node in the subtree.
    const productCount = await Product.countDocuments({
      category: { $in: subtreeIds }
    });

    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete "${category.name}": ${productCount} product${
          productCount === 1 ? ' is' : 's are'
        } assigned to it or its sub-categories. Move or delete those products first.`
      });
    }

    const deleteResult = await Category.deleteMany({ _id: { $in: subtreeIds } });

    res.status(200).json({
      success: true,
      message: `Category "${category.name}" and ${
        deleteResult.deletedCount - 1
      } nested categor${deleteResult.deletedCount - 1 === 1 ? 'y' : 'ies'} deleted`,
      deletedCount: deleteResult.deletedCount
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------------------
// ADMIN-ONLY METHODS (moved here from adminController for cohesion)
// -------------------------------------------------------------------------

// @desc    Get full category tree for admin (includes inactive + product counts)
// @route   GET /api/admin/categories
// @access  Private (Admin)
exports.getAdminCategories = async (req, res, next) => {
  try {
    const [flat, productCounts] = await Promise.all([
      Category.find().sort({ level: 1, createdAt: 1 }).lean(),
      Product.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }])
    ]);

    const countByCategoryId = {};
    productCounts.forEach((row) => {
      if (row._id) countByCategoryId[row._id.toString()] = row.count;
    });

    // Attach productCount to each node
    const withCounts = flat.map((cat) => ({
      ...cat,
      productCount: countByCategoryId[cat._id.toString()] || 0
    }));

    const tree = buildTree(withCounts);

    res.status(200).json({
      success: true,
      count: tree.length,
      categories: tree
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle a single category's active flag
// @route   PUT /api/admin/categories/:id/toggle
// @access  Private (Admin)
exports.toggleCategoryStatus = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    category.isActive = !category.isActive;
    await category.save();

    res.status(200).json({
      success: true,
      message: `Category "${category.name}" ${category.isActive ? 'enabled' : 'disabled'}`,
      category
    });
  } catch (error) {
    next(error);
  }
};

