const SiteContent = require('../models/SiteContent');

// GET /api/site-content/homepage — public read
exports.getHomepageContent = async (req, res, next) => {
  try {
    let content = await SiteContent.findOne({ key: 'homepage' });

    // Auto-create the singleton on first read with schema defaults
    if (!content) {
      content = await SiteContent.create({ key: 'homepage' });
    }

    res.status(200).json({ success: true, content });
  } catch (err) {
    next(err);
  }
};

// PUT /api/site-content/homepage — admin-only update
exports.updateHomepageContent = async (req, res, next) => {
  try {
    const allowedSections = [
      'announcement',
      'hero',
      'categoriesSection',
      'featuredSection',
      'brandStory',
      'store',              // ← store-wide settings (COD toggle, fee, threshold, lensOptions)
    ];
    const sanitizedUpdates = {};

    for (const key of allowedSections) {
      if (
        req.body[key] !== undefined &&
        typeof req.body[key] === 'object' &&
        req.body[key] !== null
      ) {
        sanitizedUpdates[key] = req.body[key];
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid site content sections provided for update'
      });
    }

    // Clamp overlayOpacity if provided in hero section
    if (
      sanitizedUpdates.hero &&
      typeof sanitizedUpdates.hero.overlayOpacity === 'number'
    ) {
      sanitizedUpdates.hero.overlayOpacity = Math.max(
        0,
        Math.min(1, sanitizedUpdates.hero.overlayOpacity)
      );
    }

    // Sanitize store values (numbers only, sensible defaults)
    if (sanitizedUpdates.store) {
      const s = sanitizedUpdates.store;

      if (typeof s.codEnabled !== 'boolean') delete s.codEnabled;
      if (typeof s.codFee !== 'number' || s.codFee < 0) delete s.codFee;
      if (
        typeof s.freeShippingThreshold !== 'number' ||
        s.freeShippingThreshold < 0
      ) {
        delete s.freeShippingThreshold;
      }
      if (typeof s.supportEmail !== 'string') delete s.supportEmail;
      if (typeof s.supportPhone !== 'string') delete s.supportPhone;
      if (typeof s.currency !== 'string') delete s.currency;
      if (typeof s.estimatedDelivery === 'string') {
        s.estimatedDelivery = s.estimatedDelivery.trim().slice(0, 300);
      } else {
        delete s.estimatedDelivery;
      }

      // lensOptions — array of { name, description, price }
      // Each entry must have a non-empty name; price is coerced to a
      // non-negative number; description is trimmed and length-limited.
      if (s.lensOptions !== undefined) {
        if (!Array.isArray(s.lensOptions)) {
          delete s.lensOptions;
        } else {
          s.lensOptions = s.lensOptions
            .map((opt) => {
              if (!opt || typeof opt !== 'object') return null;

              const name =
                typeof opt.name === 'string'
                  ? opt.name.trim().slice(0, 80)
                  : '';
              const description =
                typeof opt.description === 'string'
                  ? opt.description.trim().slice(0, 500)
                  : '';
              const rawPrice = Number(opt.price);
              const price =
                Number.isFinite(rawPrice) && rawPrice >= 0 ? rawPrice : 0;

              // Drop entries with no name — they'd show blank to customers
              if (!name) return null;

              return { name, description, price };
            })
            .filter(Boolean) // remove nulls
            .slice(0, 20);   // hard cap: no more than 20 lens options
        }
      }
    }

    const content = await SiteContent.findOneAndUpdate(
      { key: 'homepage' },
      { $set: sanitizedUpdates },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ success: true, content });
  } catch (err) {
    next(err);
  }
};