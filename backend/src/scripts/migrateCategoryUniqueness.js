const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');

mongoose.set('autoIndex', false);

const Category = require('../models/Category');

const CATEGORY_NAME_COLLATION = { locale: 'en', strength: 2 };
const SIBLING_INDEX_NAME = 'category_sibling_name_unique';
const EXPECTED_SIBLING_INDEX = { level: 1, parent: 1, name: 1 };

const normalizedName = (name) => String(name || '').trim().toLocaleLowerCase('en');

const findSiblingDuplicates = (categories) => {
  const seen = new Map();
  const duplicates = [];

  categories.forEach((category) => {
    const name = normalizedName(category.name);
    const parentId = category.parent?.toString() || null;
    const key = JSON.stringify([category.level, parentId, name]);
    const previous = seen.get(key);
    if (previous) {
      duplicates.push({
        level: category.level,
        parent: parentId,
        name: String(category.name).trim(),
        ids: [previous._id.toString(), category._id.toString()]
      });
    } else {
      seen.set(key, category);
    }
  });

  return duplicates;
};

const sameIndexKeys = (left, right) =>
  JSON.stringify(Object.entries(left)) === JSON.stringify(Object.entries(right));

const describeIndex = (index) => ({
  name: index.name,
  key: index.key,
  unique: Boolean(index.unique),
  collation: index.collation
    ? {
        locale: index.collation.locale,
        strength: index.collation.strength
      }
    : null
});

const hasSiblingIndex = (indexes) =>
  indexes.some(
    (index) =>
      index.unique &&
      sameIndexKeys(index.key, EXPECTED_SIBLING_INDEX) &&
      index.collation?.locale === CATEGORY_NAME_COLLATION.locale &&
      index.collation?.strength === CATEGORY_NAME_COLLATION.strength
  );

const isNameOnlyUniqueIndex = (index) =>
  index.unique &&
  Object.keys(index.key).length === 1 &&
  Object.prototype.hasOwnProperty.call(index.key, 'name');

const getIndexes = async () => {
  try {
    return await Category.collection.indexes();
  } catch (error) {
    if (error.code === 26) return [];
    throw error;
  }
};

const migrateCategoryUniqueness = async ({ dryRun = false } = {}) => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('Set MONGODB_URI or MONGO_URI before running this migration.');
  }
  await mongoose.connect(mongoUri, { autoIndex: false });
  console.info(
    `Inspecting database "${mongoose.connection.name}", collection "${Category.collection.collectionName}" (${dryRun ? 'dry run' : 'apply mode'}).`
  );

  const indexes = await getIndexes();
  console.info(`Current indexes: ${JSON.stringify(indexes.map(describeIndex))}`);

  const existing = await Category.find().select('_id name parent level').lean();
  const invalidNames = existing.filter(
    (category) => typeof category.name !== 'string' || !category.name.trim()
  );
  if (invalidNames.length > 0) {
    throw new Error(
      `Categories with empty or invalid names must be corrected before migration: ${invalidNames
        .map((category) => category._id.toString())
        .join(', ')}`
    );
  }
  const duplicates = findSiblingDuplicates(existing);
  if (duplicates.length > 0) {
    const details = duplicates
      .map((duplicate) => `L${duplicate.level} "${duplicate.name}" under ${duplicate.parent || 'root'}`)
      .join('; ');
    throw new Error(
      `Sibling category duplicates must be resolved before adding the unique index: ${details}. No categories were deleted.`
    );
  }

  const existingSiblingIndex = indexes.find(
    (index) => sameIndexKeys(index.key, EXPECTED_SIBLING_INDEX) && index.unique
  );
  if (existingSiblingIndex && !hasSiblingIndex([existingSiblingIndex])) {
    throw new Error(
      `Index "${existingSiblingIndex.name}" uses incompatible collation. Review it manually before migration.`
    );
  }

  const obsoleteIndexes = indexes.filter(isNameOnlyUniqueIndex);
  const unsupportedNameIndexes = indexes.filter(
    (index) =>
      index.unique &&
      Object.prototype.hasOwnProperty.call(index.key, 'name') &&
      !isNameOnlyUniqueIndex(index) &&
      !sameIndexKeys(index.key, EXPECTED_SIBLING_INDEX)
  );
  if (unsupportedNameIndexes.length > 0) {
    throw new Error(
      `Found unsupported unique category name index(es): ${unsupportedNameIndexes
        .map((index) => `${index.name} ${JSON.stringify(index.key)}`)
        .join(', ')}. Review these indexes manually; no changes were made.`
    );
  }

  const nameUpdates = existing.filter(
    (category) => category.name !== String(category.name).trim()
  );
  const actions = [];
  if (!hasSiblingIndex(indexes)) actions.push(`create ${SIBLING_INDEX_NAME}`);
  obsoleteIndexes.forEach((index) => actions.push(`drop obsolete global index ${index.name}`));
  if (nameUpdates.length > 0) actions.push(`trim ${nameUpdates.length} category name(s)`);
  if (actions.length === 0) actions.push('no changes required');
  console.info(`Planned changes: ${actions.join('; ')}.`);

  if (dryRun) {
    console.info('Dry run complete; database was not modified.');
    return { database: mongoose.connection.name, collection: Category.collection.collectionName, actions };
  }

  if (!hasSiblingIndex(indexes)) {
    await Category.collection.createIndex(EXPECTED_SIBLING_INDEX, {
      unique: true,
      collation: CATEGORY_NAME_COLLATION,
      name: SIBLING_INDEX_NAME
    });
  }

  for (const index of obsoleteIndexes) {
    console.info(`Dropping verified obsolete global category-name index "${index.name}".`);
    // eslint-disable-next-line no-await-in-loop
    await Category.collection.dropIndex(index.name);
  }

  if (nameUpdates.length > 0) {
    await Category.collection.bulkWrite(
      nameUpdates.map((category) => ({
        updateOne: {
          filter: { _id: category._id },
          update: { $set: { name: String(category.name).trim() } }
        }
      }))
    );
  }

  const finalIndexes = await Category.collection.indexes();
  console.info(
    `Category uniqueness migration complete for "${mongoose.connection.name}.${Category.collection.collectionName}". Sibling index active: ${hasSiblingIndex(finalIndexes)}; global name indexes removed: ${obsoleteIndexes.length}; names trimmed: ${nameUpdates.length}.`
  );
  return { database: mongoose.connection.name, collection: Category.collection.collectionName, actions };
};

if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  migrateCategoryUniqueness({ dryRun })
    .catch((error) => {
      console.error(
        `Category uniqueness migration failed: ${error.message}. No category documents were deleted or merged.`
      );
      process.exitCode = 1;
    })
    .finally(async () => {
      if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    });
}

module.exports = {
  findSiblingDuplicates,
  hasSiblingIndex,
  isNameOnlyUniqueIndex,
  migrateCategoryUniqueness,
  sameIndexKeys
};
