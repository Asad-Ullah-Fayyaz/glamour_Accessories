const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const slugify = require('slugify');

// @desc    Get all active categories with nested subcategories
// @route   GET /api/categories
// @access  Public
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort('name').lean();
    
    // Attach nested subcategories for each category
    const categoriesWithSubs = await Promise.all(
      categories.map(async (cat) => {
        const subCategories = await SubCategory.find({ category: cat._id, isActive: true }).sort('name');
        return {
          ...cat,
          subCategories
        };
      })
    );

    res.status(200).json({
      success: true,
      count: categoriesWithSubs.length,
      categories: categoriesWithSubs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get category details by slug
// @route   GET /api/categories/:slug
// @access  Public
exports.getCategoryBySlug = async (req, res, next) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const subCategories = await SubCategory.find({ category: category._id, isActive: true });

    res.status(200).json({
      success: true,
      category,
      subCategories
    });
  } catch (error) {
    next(error);
  }
};

// --- ADMIN CONTROLLER METHODS ---

exports.createCategory = async (req, res, next) => {
  try {
    const { name, description, image } = req.body;
    const slug = slugify(name, { lower: true, strict: true });

    const category = await Category.create({
      name,
      slug,
      description: description || '',
      image: image || ''
    });

    res.status(201).json({ success: true, category });
  } catch (error) {
    next(error);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const { name, description, image, isActive } = req.body;
    const updateData = {};
    if (name) {
      updateData.name = name;
      updateData.slug = slugify(name, { lower: true, strict: true });
    }
    if (description !== undefined) updateData.description = description;
    if (image !== undefined) updateData.image = image;
    if (isActive !== undefined) updateData.isActive = isActive;

    const category = await Category.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    res.status(200).json({ success: true, category });
  } catch (error) {
    next(error);
  }
};

exports.createSubCategory = async (req, res, next) => {
  try {
    const { name, categoryId, description } = req.body;
    const slug = slugify(name, { lower: true, strict: true });

    const subCategory = await SubCategory.create({
      name,
      slug,
      category: categoryId,
      description: description || ''
    });

    res.status(201).json({ success: true, subCategory });
  } catch (error) {
    next(error);
  }
};

exports.updateSubCategory = async (req, res, next) => {
  try {
    const { name, description, isActive } = req.body;
    const updateData = {};
    if (name) {
      updateData.name = name;
      updateData.slug = slugify(name, { lower: true, strict: true });
    }
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    const subCategory = await SubCategory.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!subCategory) return res.status(404).json({ success: false, message: 'SubCategory not found' });

    res.status(200).json({ success: true, subCategory });
  } catch (error) {
    next(error);
  }
};
