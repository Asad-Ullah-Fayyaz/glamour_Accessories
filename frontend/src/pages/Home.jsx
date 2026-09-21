import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowRight } from 'lucide-react';
import ProductCard from '../components/product/ProductCard';
import HomeReviewsSection from '../components/home/HomeReviewsSection';
import { fetchCategories, selectCategories } from '../store/slices/categoriesSlice';
import { fetchFeaturedProducts, selectFeaturedProducts } from '../store/slices/productsSlice';
import api, { toAbsoluteUrl } from '../services/api';

const EMPTY_CONTENT = {
  announcement: { text: '', enabled: false },
  hero: {
    badge: '',
    heading: '',
    subheading: '',
    backgroundImage: '',
    overlayOpacity: 0.9,
    primaryBtnText: '',
    primaryBtnLink: '/products',
    secondaryBtnText: '',
    secondaryBtnLink: '/products'
  },
  categoriesSection: { eyebrow: '', heading: '' },
  featuredSection: { eyebrow: '', heading: '', ctaText: '', ctaLink: '/products' },
  brandStory: { eyebrow: '', heading: '', paragraph1: '', paragraph2: '', ctaText: '', ctaLink: '/products', image: '' }
};

// Merge API content over empty defaults, section by section.
// If the backend is unreachable, the frontend should render nothing.
function mergeContent(apiContent) {
  if (!apiContent) return EMPTY_CONTENT;
  const merged = { ...EMPTY_CONTENT };
  for (const key of Object.keys(EMPTY_CONTENT)) {
    if (apiContent[key]) {
      merged[key] = { ...EMPTY_CONTENT[key], ...apiContent[key] };
    }
  }
  return merged;
}

export default function Home() {
  const dispatch = useDispatch();
  const categories = useSelector(selectCategories);
  const featuredProducts = useSelector(selectFeaturedProducts);
  const [content, setContent] = useState(EMPTY_CONTENT);
  const [loading, setLoading] = useState(true);

   useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchFeaturedProducts());

    const loadHomeData = async () => {
      try {
        const contentRes = await api.get('/site-content/homepage');
        if (contentRes.success) {
          setContent(mergeContent(contentRes.content));
        } else {
          setContent(EMPTY_CONTENT);
        }
      } catch (err) {
        setContent(EMPTY_CONTENT);
      } finally {
        setLoading(false);
      }
    };
    loadHomeData();
  }, [dispatch]);

  const hero = content.hero;
  const categoriesSection = content.categoriesSection;
  const featuredSection = content.featuredSection;
  const brandStory = content.brandStory;
  const hasHeroContent = !!(hero?.badge || hero?.heading || hero?.subheading || hero?.backgroundImage);
  const hasCategoriesContent = !!(
    categoriesSection?.eyebrow ||
    categoriesSection?.heading ||
    categories.length
  );
  const hasFeaturedContent = !!(
    featuredSection?.eyebrow ||
    featuredSection?.heading ||
    featuredSection?.ctaText ||
    featuredProducts.length
  );
  const hasBrandContent = !!(
    brandStory?.eyebrow ||
    brandStory?.heading ||
    brandStory?.paragraph1 ||
    brandStory?.paragraph2 ||
    brandStory?.image
  );
  const heroBackgroundImage = hero?.backgroundImage ? toAbsoluteUrl(hero.backgroundImage) : '';
  const brandImage = brandStory?.image ? toAbsoluteUrl(brandStory.image) : '';

  return (
    <div className="home">
      {hasHeroContent && (
        <section
          className="home-hero"
          style={{
            backgroundImage: heroBackgroundImage
              ? `linear-gradient(rgba(250,250,250,${Math.max(0, (hero.overlayOpacity ?? 0.9) - 0.05)}), rgba(250,250,250,${hero.overlayOpacity ?? 0.9})), url("${heroBackgroundImage}")`
              : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="container home-hero-inner">
            {hero.badge && <span className="badge badge-gold home-hero-badge">{hero.badge}</span>}
            {hero.heading && <h1 className="home-hero-title">{hero.heading}</h1>}
            {hero.subheading && <p className="home-hero-sub">{hero.subheading}</p>}
            {(hero.primaryBtnText || hero.secondaryBtnText) && (
              <div className="home-hero-actions">
                {hero.primaryBtnText && hero.primaryBtnLink && (
                  <Link to={hero.primaryBtnLink} className="btn btn-primary">
                    {hero.primaryBtnText} <ArrowRight size={16} />
                  </Link>
                )}
                {hero.secondaryBtnText && hero.secondaryBtnLink && (
                  <Link to={hero.secondaryBtnLink} className="btn btn-secondary">
                    {hero.secondaryBtnText}
                  </Link>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {hasCategoriesContent && (
        <section className="home-section home-section--white">
          <div className="container">
            {categoriesSection.eyebrow && <div className="home-eyebrow">{categoriesSection.eyebrow}</div>}
            {categoriesSection.heading && <h2 className="home-heading">{categoriesSection.heading}</h2>}

            {categories.length > 0 && (
              <div className="home-categories">
                {categories.map((cat) => (
                  <Link
                    key={cat._id}
                    to={`/products?category=${cat.slug}`}
                    className="category-card"
                  >
                    {cat.image && (
                      <img
                        src={toAbsoluteUrl(cat.image)}
                        alt={cat.name}
                        className="category-card-img"
                      />
                    )}
                    <div className="category-card-overlay">
                      <h3 className="category-card-title">{cat.name}</h3>
                      {cat.description && <p className="category-card-desc">{cat.description}</p>}
                      <span className="category-card-cta">
                        View House <ArrowRight size={14} />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {hasFeaturedContent && (
        <section className="home-section home-section--secondary">
          <div className="container">
            <div className="home-featured-header">
              <div>
                {featuredSection.eyebrow && <div className="home-eyebrow">{featuredSection.eyebrow}</div>}
                {featuredSection.heading && <h2 className="home-heading">{featuredSection.heading}</h2>}
              </div>
              {featuredSection.ctaText && featuredSection.ctaLink && (
                <Link to={featuredSection.ctaLink} className="btn btn-secondary btn-sm">
                  {featuredSection.ctaText} <ArrowRight size={14} />
                </Link>
              )}
            </div>

            {loading ? (
              <div className="home-spinner-wrap">
                <div className="spinner"></div>
              </div>
            ) : (
              <div className="grid-products">
                {featuredProducts.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {hasBrandContent && (
        <section className="home-brand">
          <div className="container home-brand-inner">
            <div className="home-brand-text">
              {brandStory.eyebrow && <span className="home-brand-eyebrow">{brandStory.eyebrow}</span>}
              {brandStory.heading && <h2 className="home-brand-heading">{brandStory.heading}</h2>}
              {brandStory.paragraph1 && <p className="home-brand-para">{brandStory.paragraph1}</p>}
              {brandStory.paragraph2 && <p className="home-brand-para">{brandStory.paragraph2}</p>}
              {brandStory.ctaText && brandStory.ctaLink && (
                <Link to={brandStory.ctaLink} className="btn btn-primary">
                  {brandStory.ctaText}
                </Link>
              )}
            </div>

            {brandImage && (
              <div className="home-brand-image-wrap">
                <img
                  src={brandImage}
                  alt="Editorial AXI Product Shot"
                  className="home-brand-image"
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Customer Reviews Section — Right Before Footer */}
      <HomeReviewsSection />

      <style>{`
        /* === Hero === */
        .home-hero {
          position: relative;
          min-height: 78vh;
          background-color: var(--bg-secondary);
          color: var(--text-primary);
          display: flex;
          align-items: center;
          border-bottom: 1px solid var(--border-light);
        }
        .home-hero-inner {
          padding: 4.5rem 1.5rem;
          max-width: 900px;
        }
        .home-hero-badge {
          margin-bottom: 1.5rem;
          letter-spacing: 0.2em;
        }
        .home-hero-title {
          font-family: var(--font-serif);
          font-size: clamp(2.5rem, 5vw, 4.2rem);
          font-weight: 400;
          line-height: 1.1;
          letter-spacing: -0.02em;
          margin-bottom: 1.5rem;
          color: var(--text-primary);
        }
        .home-hero-sub {
          font-size: 1.1rem;
          color: var(--text-secondary);
          line-height: 1.7;
          max-width: 640px;
          margin-bottom: 2.5rem;
        }
        .home-hero-actions {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        /* === Section shells === */
        .home-section {
          padding: 5rem 0;
          border-bottom: 1px solid var(--border-light);
        }
        .home-section--white {
          background-color: #FFFFFF;
        }
        .home-section--secondary {
          background-color: var(--bg-secondary);
        }
        .home-eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.15em;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 0.5rem;
        }
        .home-heading {
          font-family: var(--font-serif);
          font-size: 2.2rem;
          margin-bottom: 2.5rem;
          color: var(--text-primary);
          line-height: 1.2;
        }

        /* === Categories === */
        .home-categories {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
          gap: 2rem;
        }
        .category-card {
          position: relative;
          height: 360px;
          overflow: hidden;
          display: block;
          text-decoration: none;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-sm);
        }
        .category-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.6s ease;
        }
        .category-card:hover .category-card-img {
          transform: scale(1.05);
        }
        .category-card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to top,
            rgba(0, 0, 0, 0.75) 0%,
            rgba(0, 0, 0, 0.1) 60%,
            transparent 100%
          );
          padding: 2rem;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          color: #FFFFFF;
        }
        .category-card-title {
          font-family: var(--font-serif);
          font-size: 1.75rem;
          font-weight: 400;
          line-height: 1.2;
        }
        .category-card-desc {
          font-size: 0.85rem;
          color: #E0E0E0;
          margin-top: 0.4rem;
          line-height: 1.4;
        }
        .category-card-cta {
          font-size: 0.75rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          margin-top: 1rem;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        /* === Featured header === */
        .home-featured-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 2.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .home-featured-header .home-heading {
          margin-bottom: 0;
        }
        .home-spinner-wrap {
          display: flex;
          justify-content: center;
          padding: 4rem;
        }

        /* === Brand story === */
        .home-brand {
          background-color: #FFFFFF;
          color: var(--text-primary);
          padding: 6rem 0;
        }
        .home-brand-inner {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 4rem;
          align-items: center;
        }
        .home-brand-text {
          min-width: 0;
        }
        .home-brand-eyebrow {
          font-size: 0.75rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--accent-gold);
          font-weight: 700;
        }
        .home-brand-heading {
          font-family: var(--font-serif);
          font-size: 2.5rem;
          margin: 1rem 0 1.5rem 0;
          font-weight: 400;
          line-height: 1.2;
          color: var(--text-primary);
        }
        .home-brand-para {
          color: var(--text-secondary);
          font-size: 0.95rem;
          line-height: 1.8;
          margin-bottom: 1.5rem;
        }
        .home-brand-para:last-of-type {
          margin-bottom: 2rem;
        }
        .home-brand-image-wrap {
          position: relative;
          min-width: 0;
        }
        .home-brand-image {
          width: 100%;
          height: 500px;
          object-fit: cover;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-light);
          display: block;
        }

        /* === Responsive Breakpoints === */
        @media (max-width: 900px) {
          .home-brand-inner {
            grid-template-columns: 1fr;
            gap: 2.5rem;
          }
          .home-brand-image {
            height: 380px;
          }
        }

        @media (max-width: 640px) {
          .home-hero {
            min-height: 60vh;
          }
          .home-hero-inner {
            padding: 3rem 1rem;
          }
          .home-hero-sub {
            font-size: 0.95rem;
            margin-bottom: 2rem;
          }
          .home-hero-actions {
            flex-direction: column;
            align-items: stretch;
          }
          .home-hero-actions .btn {
            width: 100%;
            justify-content: center;
          }

          .home-section {
            padding: 3rem 0;
          }
          .home-heading {
            font-size: 1.6rem;
            margin-bottom: 1.75rem;
          }

          .home-categories {
            gap: 1.25rem;
          }
          .category-card {
            height: 280px;
          }
          .category-card-overlay {
            padding: 1.25rem;
          }
          .category-card-title {
            font-size: 1.35rem;
          }
          .category-card-desc {
            font-size: 0.8rem;
          }

          .home-brand {
            padding: 3.5rem 0;
          }
          .home-brand-heading {
            font-size: 1.75rem;
          }
          .home-brand-para {
            font-size: 0.9rem;
          }
          .home-brand-image {
            height: 280px;
          }
        }

        @media (max-width: 400px) {
          .home-hero-title {
            font-size: 2rem;
          }
          .category-card {
            height: 240px;
          }
          .category-card-title {
            font-size: 1.2rem;
          }
          .home-brand-image {
            height: 220px;
          }
        }
      `}</style>
    </div>
  );
}