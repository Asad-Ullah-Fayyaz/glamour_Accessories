const mongoose = require('mongoose');

const siteContentSchema = new mongoose.Schema(
  {
    // Singleton key — always 'homepage' so there's exactly one document
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'homepage'
    },

    // Announcement Bar
    announcement: {
      text: {
        type: String,
        default:
          'Complimentary Shipping Over PKR 20,000 • Cash On Delivery Available Nationwide • Premium Quality Guaranteed'
      },
      enabled: { type: Boolean, default: true }
    },

    store: {
      codEnabled: { type: Boolean, default: true },
      codFee: { type: Number, default: 300 },
      freeShippingThreshold: { type: Number, default: 5000 },
      supportEmail: { type: String, default: 'support@axicollection.com' },
      supportPhone: { type: String, default: '' },
      currency: { type: String, default: 'PKR' },
      estimatedDelivery: {
        type: String,
        default:
          'Typically 2–4 business days for major cities, and 4–6 business days for remote areas across Pakistan.',
        maxlength: [300, 'Estimated delivery text cannot exceed 300 characters']
      },
      // Admin-configured lens options for customizable (prescription) products.
      // Each entry: { name, description, price }
      // Empty array means: no lens selection appears on any product.
      lensOptions: {
        type: [
          {
            _id: false,
            name: { type: String, default: '', maxlength: 80 },
            description: { type: String, default: '', maxlength: 500 },
            price: { type: Number, default: 0, min: 0 }
          }
        ],
        default: []
      }
    },

    // Hero Section
    hero: {
      badge: { type: String, default: 'AUTUMN / WINTER 2026 EDITION' },
      heading: {
        type: String,
        default: 'Architectural Precision. Timeless Presence.'
      },
      subheading: {
        type: String,
        default:
          'Discover AXI Collection — curated luxury horology timepieces, titanium optical eyewear, and minimalist mobile gear crafted for uncompromising distinction.'
      },
      backgroundImage: {
        type: String,
        default:
          'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=2000&auto=format&fit=crop'
      },
      overlayOpacity: {
        type: Number,
        default: 0.9,     // 0 = fully transparent overlay (full image), 1 = fully white (image hidden)
        min: 0,
        max: 1
      },

      // ── Hero media slideshow ──
      // Multiple slide images. Empty array = fall back to backgroundImage.
      images: {
        type: [String],
        default: []
      },
      // One optional hero video URL. Empty string = no video.
      video: {
        type: String,
        default: ''
      },
      // Seconds each image stays on screen before advancing.
      slideInterval: {
        type: Number,
        default: 4.5,
        min: 2,
        max: 15
      },

      primaryBtnText: { type: String, default: 'Explore Collection' },
      primaryBtnLink: { type: String, default: '/products' },
      secondaryBtnText: { type: String, default: 'Discover Watches' },
      secondaryBtnLink: { type: String, default: '/products?category=watches' }
    },

    // Featured Categories Section
    categoriesSection: {
      eyebrow: { type: String, default: 'CURATED SELECTION' },
      heading: { type: String, default: 'Explore Category Houses' }
    },

    // Featured Products Section
    featuredSection: {
      eyebrow: { type: String, default: 'HIGHLIGHTED EDITIONS' },
      heading: { type: String, default: 'Featured Timepieces & Gear' },
      ctaText: { type: String, default: 'View Entire Catalog' },
      ctaLink: { type: String, default: '/products' }
    },

    // Brand Story Section
    brandStory: {
      eyebrow: { type: String, default: 'THE AXI PHILOSOPHY' },
      heading: { type: String, default: 'Designed for the Discerning Few.' },
      paragraph1: {
        type: String,
        default:
          'At AXI Collection, we reject mass production and cheap disposable trends. Every timepiece, frame, and leather accessory is forged with meticulous attention to tactile weight, material durability, and visual harmony.'
      },
      paragraph2: {
        type: String,
        default:
          'We offer Cash on Delivery nationwide across Pakistan, empowering you to order with complete confidence and peace of mind.'
      },
      ctaText: { type: String, default: 'Shop The New Arrival Drop' },
      ctaLink: { type: String, default: '/products' },
      image: {
        type: String,
        default:
          'https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=1000&auto=format&fit=crop'
      }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('SiteContent', siteContentSchema);