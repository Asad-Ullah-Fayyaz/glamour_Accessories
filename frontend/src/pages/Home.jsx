import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ArrowRight } from "lucide-react";
import ProductCard from "../components/product/ProductCard";
import HomeReviewsSection from "../components/home/HomeReviewsSection";
import {
  fetchCategories,
  selectCategories,
} from "../store/slices/categoriesSlice";
import {
  fetchFeaturedProducts,
  selectFeaturedProducts,
} from "../store/slices/productsSlice";
import api, { toAbsoluteUrl } from "../services/api";

const EMPTY_CONTENT = {
  announcement: { text: "", enabled: false },
  hero: {
    badge: "",
    heading: "",
    subheading: "",
    backgroundImage: "",
    images: [],
    video: "",
    slideInterval: 4.5,
    overlayOpacity: 0.9,
    primaryBtnText: "",
    primaryBtnLink: "/products",
    secondaryBtnText: "",
    secondaryBtnLink: "/products",
  },
  categoriesSection: { eyebrow: "", heading: "" },
  featuredSection: {
    eyebrow: "",
    heading: "",
    ctaText: "",
    ctaLink: "/products",
  },
  brandStory: {
    eyebrow: "",
    heading: "",
    paragraph1: "",
    paragraph2: "",
    ctaText: "",
    ctaLink: "/products",
    image: "",
  },
};

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

/* Scroll-reveal hook — callback-ref based with a safety net. */
function useReveal({ threshold = 0.15, rootMargin = "0px 0px -10% 0px" } = {}) {
  const [inView, setInView] = useState(false);
  const [node, setNode] = useState(null);
  const observerRef = useRef(null);
  const timeoutRef = useRef(null);

  const ref = useCallback((el) => setNode(el), []);

  useEffect(() => {
    if (!node) return undefined;

    if (
      typeof window === "undefined" ||
      typeof IntersectionObserver === "undefined"
    ) {
      setInView(true);
      return undefined;
    }

    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const rect = node.getBoundingClientRect();
    const viewportH =
      window.innerHeight || document.documentElement.clientHeight || 0;
    const targetVisiblePx = Math.min(rect.height, viewportH) * 0.5;
    const maxSafeThreshold =
      rect.height > 0
        ? Math.max(0.05, targetVisiblePx / rect.height)
        : threshold;
    const safeThreshold = Math.min(threshold, maxSafeThreshold);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
            observerRef.current = null;
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
          }
        });
      },
      { threshold: safeThreshold, rootMargin },
    );

    observer.observe(node);
    observerRef.current = observer;

    timeoutRef.current = setTimeout(() => {
      const r = node.getBoundingClientRect();
      const vh =
        window.innerHeight || document.documentElement.clientHeight || 0;
      if (r.top < vh && r.bottom > 0) {
        setInView(true);
      }
    }, 1500);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [node, threshold, rootMargin]);

  return [ref, inView];
}

function useRevealLate() {
  return useReveal({ threshold: 0.25, rootMargin: "0px 0px -10% 0px" });
}

const optimizeVideoUrl = (url) => {
  if (!url || typeof url !== "string") return url;
  if (!url.includes("/video/upload/")) return url;
  if (/\/video\/upload\/[^/]*,/.test(url)) return url;
  return url.replace(
    "/video/upload/",
    "/video/upload/w_960,q_auto:good,f_auto/",
  );
};
const HERO_SLIDE_MS = 900;

function HeroMediaSlider({ hero }) {
  const slides = useMemo(() => {
    const list = [];
    if (hero?.video) {
      list.push({ type: "video", src: toAbsoluteUrl(hero.video) });
    }
    const imgs =
      hero?.images && hero.images.length
        ? hero.images
        : hero?.backgroundImage
          ? [hero.backgroundImage]
          : [];
    imgs
      .filter(Boolean)
      .forEach((img) => list.push({ type: "image", src: toAbsoluteUrl(img) }));
    return list;
  }, [hero?.video, hero?.images, hero?.backgroundImage]);

  const [active, setActive] = useState(0);
  const [prev, setPrev] = useState(null);
  const timerRef = useRef(null);
  const cleanupRef = useRef(null);
  const videoRef = useRef(null);

  const intervalMs = Math.max(2, hero?.slideInterval ?? 4.5) * 1000;
  const overlayOpacity = hero?.overlayOpacity ?? 0.9;

  useEffect(() => {
    setActive(0);
    setPrev(null);
  }, [slides.length]);

  const goTo = useCallback((nextIndex) => {
    setActive((currentActive) => {
      if (nextIndex === currentActive || nextIndex == null)
        return currentActive;
      setPrev(currentActive);

      if (cleanupRef.current) clearTimeout(cleanupRef.current);
      cleanupRef.current = setTimeout(() => {
        setPrev(null);
        cleanupRef.current = null;
      }, HERO_SLIDE_MS);

      return nextIndex;
    });
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      const v = videoRef.current;
      const currentSlide = slides[active];
      if (currentSlide?.type !== "video") {
        try {
          v.pause();
        } catch (e) {}
      }
    }
  }, [active, slides]);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (slides.length < 2) return undefined;
    const current = slides[active];
    if (!current || current.type !== "image") return undefined;

    timerRef.current = setTimeout(() => {
      goTo((active + 1) % slides.length);
    }, intervalMs);

    return () => clearTimeout(timerRef.current);
  }, [active, slides, intervalMs, goTo]);

  useEffect(() => {
    const current = slides[active];
    if (current?.type === "video" && videoRef.current) {
      const v = videoRef.current;
      try {
        v.currentTime = 0;
        v.muted = true;
        v.playsInline = true;
        const p = v.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch (e) {}
    }
  }, [active, slides]);

  useEffect(
    () => () => {
      if (cleanupRef.current) clearTimeout(cleanupRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  if (!slides.length) return null;

  const currentSlide = slides[active];
  const prevSlide = prev != null ? slides[prev] : null;

  const renderMedia = (slide, isActive, ref) => {
    if (slide.type === "video") {
      return (
        <video
          ref={isActive ? ref : null}
          className="hero-slide-media hero-slide-video"
          src={optimizeVideoUrl(slide.src)}
          muted
          playsInline
          autoPlay={isActive}
          preload="auto"
          onEnded={
            isActive ? () => goTo((active + 1) % slides.length) : undefined
          }
        />
      );
    }
    return <img className="hero-slide-media" src={slide.src} alt="" />;
  };

  return (
    <div className="hero-slider" aria-hidden="true">
      {prevSlide && (
        <div key={`prev-${prev}`} className="hero-slide hero-slide--exit">
          <div className="hero-slide-zoom">
            {renderMedia(prevSlide, false, null)}
          </div>
        </div>
      )}

      <div key={`active-${active}`} className="hero-slide hero-slide--enter">
        <div
          className={`hero-slide-zoom${currentSlide.type === "image" ? " is-active" : ""}`}
        >
          {renderMedia(currentSlide, true, videoRef)}
        </div>
      </div>

      <div
        className="hero-slide-overlay"
        style={{
          background: `linear-gradient(rgba(255,255,255,${Math.max(
            0,
            overlayOpacity - 0.05,
          )}), rgba(255,255,255,${overlayOpacity}))`,
        }}
      />

      {slides.length > 1 && (
        <div className="hero-slide-dots">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`hero-dot${i === active ? " is-active" : ""}`}
              onClick={() => goTo(i)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") goTo(i);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* =================================================================
   NEW: Editorial marquee strip — appears between sections as a
   bold black band with repeating white text.
   ================================================================= */
function EditorialStrip({ text = "GLAMOUR ACCESSORIES · EDITORIAL LUXURY · CRAFTED IN PAKISTAN" }) {
  const repeated = Array(6).fill(text);
  return (
    <div className="editorial-strip" aria-hidden="true">
      <div className="editorial-strip-track">
        {repeated.map((t, i) => (
          <span key={i} className="editorial-strip-item">
            {t} <span className="editorial-strip-dot">●</span>
          </span>
        ))}
      </div>
    </div>
  );
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
        const contentRes = await api.get("/site-content/homepage");
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

  const hasHeroContent = !!(
    hero?.badge ||
    hero?.heading ||
    hero?.subheading ||
    hero?.backgroundImage ||
    (hero?.images && hero.images.length) ||
    hero?.video
  );
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
  const brandImage = brandStory?.image ? toAbsoluteUrl(brandStory.image) : "";

  const [featuredRef, featuredInView] = useReveal();
  const [categoriesRef, categoriesInView] = useRevealLate();
  const [brandRef, brandInView] = useReveal();

  return (
    <div className="home">
      {/* ============================================================
          1. HERO
          ============================================================ */}
      <section className="home-hero" id="home-top">
        {hasHeroContent ? (
          <>
            <HeroMediaSlider hero={hero} />

            <div className="container home-hero-inner">
              {hero.badge && (
                <span className="badge badge-dark home-hero-badge">
                  {hero.badge}
                </span>
              )}
              {hero.heading && (
                <h1 className="home-hero-title">{hero.heading}</h1>
              )}
              {hero.subheading && (
                <p className="home-hero-sub">{hero.subheading}</p>
              )}
              {(hero.primaryBtnText || hero.secondaryBtnText) && (
                <div className="home-hero-actions">
                  {hero.primaryBtnText && hero.primaryBtnLink && (
                    <Link to={hero.primaryBtnLink} className="btn btn-primary">
                      {hero.primaryBtnText} <ArrowRight size={16} />
                    </Link>
                  )}
                  {hero.secondaryBtnText && hero.secondaryBtnLink && (
                    <Link
                      to={hero.secondaryBtnLink}
                      className="btn btn-secondary"
                    >
                      {hero.secondaryBtnText}
                    </Link>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="home-hero-placeholder" aria-hidden="true" />
        )}
      </section>

      {/* ============================================================
          2. FEATURED PRODUCTS — now directly after hero
          ============================================================ */}
      {hasFeaturedContent && (
        <section
          ref={featuredRef}
          className={`home-featured-dark reveal-section${
            featuredInView ? " in-view" : ""
          }`}
        >
          <div className="container">
            <div className="home-featured-header">
              <div className="home-featured-header-left">
                <span className="home-featured-index">01 / FEATURED</span>
                {featuredSection.eyebrow && (
                  <div className="home-eyebrow home-eyebrow--light">
                    {featuredSection.eyebrow}
                  </div>
                )}
                {featuredSection.heading && (
                  <h2 className="home-heading home-heading--light">
                    {featuredSection.heading}
                  </h2>
                )}
              </div>
              {featuredSection.ctaText && featuredSection.ctaLink && (
                <Link
                  to={featuredSection.ctaLink}
                  className="btn btn-invert btn-sm"
                >
                  {featuredSection.ctaText} <ArrowRight size={14} />
                </Link>
              )}
            </div>

            {loading ? (
              <div className="home-spinner-wrap">
                <div className="spinner spinner--light"></div>
              </div>
            ) : (
              <div className="grid-products grid-products--on-dark">
                {featuredProducts.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Editorial marquee strip */}
      <EditorialStrip />

      {/* ============================================================
          3. CATEGORIES — now second (was first)
          ============================================================ */}
      {hasCategoriesContent && (
        <section
          ref={categoriesRef}
          className={`home-section home-section--white reveal-section reveal-categories${
            categoriesInView ? " in-view" : ""
          }`}
        >
          <div className="container">
            <div className="home-categories-header">
              <div>
                <span className="home-section-index">02 / COLLECTIONS</span>
                {categoriesSection.eyebrow && (
                  <div className="home-eyebrow">{categoriesSection.eyebrow}</div>
                )}
                {categoriesSection.heading && (
                  <h2 className="home-heading">{categoriesSection.heading}</h2>
                )}
              </div>
            </div>

            {categories.length > 0 && (
              <div className="home-categories home-categories--editorial">
                {categories.map((cat, idx) => (
                  <Link
                    key={cat._id}
                    to={`/products?category=${cat.slug}`}
                    className="category-card category-card--editorial"
                  >
                    {cat.image && (
                      <img
                        src={toAbsoluteUrl(cat.image)}
                        alt={cat.name}
                        className="category-card-img"
                      />
                    )}
                    <div className="category-card-overlay">
                      <span className="category-card-number">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <h3 className="category-card-title">{cat.name}</h3>
                      {cat.description && (
                        <p className="category-card-desc">{cat.description}</p>
                      )}
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

      {/* ============================================================
          4. BRAND STORY — black background, white text
          ============================================================ */}
      {hasBrandContent && (
        <section
          ref={brandRef}
          className={`home-brand home-brand--dark reveal-section${
            brandInView ? " in-view" : ""
          }`}
        >
          <div className="container home-brand-inner">
            <div className="home-brand-text">
              <span className="home-section-index home-section-index--light">
                03 / THE HOUSE
              </span>
              {brandStory.eyebrow && (
                <span className="home-brand-eyebrow">
                  {brandStory.eyebrow}
                </span>
              )}
              {brandStory.heading && (
                <h2 className="home-brand-heading">{brandStory.heading}</h2>
              )}
              {brandStory.paragraph1 && (
                <p className="home-brand-para">{brandStory.paragraph1}</p>
              )}
              {brandStory.paragraph2 && (
                <p className="home-brand-para">{brandStory.paragraph2}</p>
              )}
              {brandStory.ctaText && brandStory.ctaLink && (
                <Link
                  to={brandStory.ctaLink}
                  className="btn btn-invert"
                >
                  {brandStory.ctaText}
                </Link>
              )}
            </div>

            {brandImage && (
              <div className="home-brand-image-wrap">
                <img
                  src={brandImage}
                  alt="Editorial Glamour Product Shot"
                  className="home-brand-image"
                />
                <span className="home-brand-image-caption">
                  GLAMOUR · EST. 2024
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      <HomeReviewsSection />

      <style>{`
        /* ---------------------------------------------------------------
           Homepage wrapper
           --------------------------------------------------------------- */
        .home {
          --navbar-offset: 110px;
          margin-top: calc(-1 * var(--navbar-offset));
          position: relative;
          background-color: #FFFFFF;
        }

        /* ---------------------------------------------------------------
           Hero section
           --------------------------------------------------------------- */
        .home-hero {
          position: relative;
          height: 100vh;
          height: 100svh;
          min-height: 560px;
          max-height: 900px;
          background-color: #F5F5F5;
          color: #000000;
          display: flex;
          align-items: center;
          border-bottom: 1px solid #000000;
          overflow: hidden;
          padding-top: var(--navbar-offset);
          box-sizing: border-box;
          scroll-margin-top: 0;
        }

        body:has(.navbar-header.has-announcement) .home-hero {
          padding-top: calc(var(--navbar-offset) + 30px);
        }

        .home-hero-placeholder {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #F5F5F5 0%, #EDEDED 100%);
        }

        /* Hero slider */
        .hero-slider {
          position: absolute;
          inset: 0;
          overflow: hidden;
          z-index: 0;
          background-color: #F5F5F5;
        }

        .hero-slide {
          position: absolute;
          inset: 0;
          will-change: transform;
          backface-visibility: hidden;
          overflow: hidden;
          background-color: #F5F5F5;
        }

        .hero-slide--enter {
          animation: heroSlideIn 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
          z-index: 2;
        }

        .hero-slide--exit {
          animation: heroSlideOut 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
          z-index: 1;
        }

        @keyframes heroSlideIn {
          from { transform: translateX(100%); opacity: 0.7; }
          to   { transform: translateX(0);   opacity: 1; }
        }

        @keyframes heroSlideOut {
          from { transform: translateX(0);    opacity: 1; }
          to   { transform: translateX(-100%); opacity: 0.7; }
        }

        .hero-slide-zoom {
          position: absolute;
          inset: 0;
        }

        .hero-slide-zoom.is-active {
          animation: heroKenBurns 6.5s ease-out forwards;
        }

        @keyframes heroKenBurns {
          from { transform: scale(1.07); }
          to   { transform: scale(1); }
        }

        .hero-slide-media {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-position: center center;
          object-fit: fill;
        }

        .hero-slide-video {
          animation: none !important;
          transform: none !important;
        }

        .hero-slide-overlay {
          position: absolute;
          inset: 0;
          z-index: 3;
          pointer-events: none;
        }

        .hero-slide-dots {
          position: absolute;
          bottom: 1.5rem;
          left: 50%;
          transform: translateX(-50%);
          z-index: 4;
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .hero-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.25);
          transition: background 0.35s ease, transform 0.35s ease;
          cursor: pointer;
          border: none;
          padding: 0;
        }

        .hero-dot.is-active {
          background: #000000;
          transform: scale(1.4);
        }

        /* Hero text */
        .home-hero-inner {
          position: relative;
          z-index: 4;
          padding: 4.5rem 1.5rem;
          max-width: 900px;
          width: 100%;
        }

        .home-hero-badge {
          margin-bottom: 1.5rem;
          letter-spacing: 0.2em;
        }

        .home-hero-title {
          font-family: var(--font-serif);
          font-size: clamp(2.2rem, 5vw, 4.2rem);
          font-weight: 400;
          line-height: 1.08;
          letter-spacing: -0.02em;
          margin-bottom: 1.5rem;
          color: #fff5f5;
        }

        .home-hero-sub {
          font-size: 1.05rem;
          color: #444444;
          line-height: 1.75;
          max-width: 580px;
          margin-bottom: 2.5rem;
        }

        .home-hero-actions {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .home-hero-badge,
        .home-hero-title,
        .home-hero-sub,
        .home-hero-actions {
          animation: heroFadeUp 0.85s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .home-hero-badge   { animation-delay: 0.1s; }
        .home-hero-title   { animation-delay: 0.22s; }
        .home-hero-sub     { animation-delay: 0.38s; }
        .home-hero-actions { animation-delay: 0.52s; }

        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ---------------------------------------------------------------
           Section shells
           --------------------------------------------------------------- */
        .home-section {
          padding: 6rem 0;
          border-bottom: 1px solid #000000;
        }

        .home-section--white {
          background-color: #FFFFFF;
        }

        .home-eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.15em;
          font-size: 0.72rem;
          font-weight: 600;
          color: #525252;
          margin-bottom: 0.5rem;
        }

        .home-eyebrow--light {
          color: #000000;
        }

        .home-heading {
          font-family: var(--font-serif);
          font-size: 2.4rem;
          margin-bottom: 2.5rem;
          color: #000000;
          line-height: 1.15;
          letter-spacing: -0.01em;
        }

        .home-heading--light {
          color: #000000;
        }

        /* Section index label (editorial numbering) */
        .home-section-index,
        .home-featured-index {
          display: inline-block;
          font-family: var(--font-mono);
          font-size: 0.7rem;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #767676;
          margin-bottom: 1rem;
        }

        .home-section-index--light,
        .home-featured-index {
          color: #AAAAAA;
        }

        /* ---------------------------------------------------------------
           FEATURED section — full black
           --------------------------------------------------------------- */
        .home-featured-dark {
     background-color: #ffffff;
          color: #ffffff;
          padding: 6rem 0;
          border-bottom: 1px solid #000000;
        }

        .home-featured-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 3rem;
          flex-wrap: wrap;
          gap: 1.5rem;
        }

        .home-featured-header-left {
          max-width: 720px;
        }

        .home-featured-header .home-heading--light {
          margin-bottom: 0;
        }

        .home-spinner-wrap {
          display: flex;
          justify-content: center;
          padding: 4rem;
        }

        .spinner--light {
          border-color: #333333;
          border-top-color: #000000;
        }

        /* Buttons on dark surfaces */
        .btn-invert {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.85rem 1.75rem;
          font-size: 0.825rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          border-radius: var(--radius-sm);
          background-color: transparent;
          color: #0a0000;
          border: 1px solid #000000;
          transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
          white-space: nowrap;
          cursor: pointer;
        }

        .btn-invert:hover {
          background-color: #FFFFFF;
          color: #000000;
          transform: translateY(-2px);
        }

        .btn-invert.btn-sm {
          padding: 0.5rem 1rem;
          font-size: 0.75rem;
        }

        /* Editorial marquee strip */
        .editorial-strip {
          background-color: #000000;
          color: #FFFFFF;
          border-top: 1px solid #FFFFFF;
          border-bottom: 1px solid #000000;
          padding: 1.1rem 0;
          overflow: hidden;
          white-space: nowrap;
        }

        .editorial-strip-track {
          display: inline-flex;
          gap: 2rem;
          animation: editorialScroll 60s linear infinite;
        }

        .editorial-strip-item {
          font-family: var(--font-serif);
          font-style: italic;
          font-size: 1.1rem;
          letter-spacing: 0.05em;
          display: inline-flex;
          align-items: center;
          gap: 2rem;
        }

        .editorial-strip-dot {
          font-size: 0.6rem;
          opacity: 0.7;
        }

        @keyframes editorialScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }

        /* ---------------------------------------------------------------
           Scroll-reveal
           --------------------------------------------------------------- */
        .reveal-section {
          opacity: 0;
          transform: translateY(32px);
          transition:
            opacity 0.75s cubic-bezier(0.16, 1, 0.3, 1),
            transform 0.75s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform;
        }

        .reveal-section.in-view {
          opacity: 1;
          transform: translateY(0);
        }

        .reveal-section.reveal-categories {
          transition:
            opacity 0.75s cubic-bezier(0.16, 1, 0.3, 1) 0.08s,
            transform 0.75s cubic-bezier(0.16, 1, 0.3, 1) 0.08s;
        }

        .reveal-section .category-card,
        .reveal-section .product-card {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform;
        }

        .reveal-section.in-view .category-card,
        .reveal-section.in-view .product-card {
          opacity: 1;
          transform: translateY(0);
        }

        .reveal-section.in-view .category-card:nth-child(1),
        .reveal-section.in-view .product-card:nth-child(1) { transition-delay: 0.05s; }

        .reveal-section.in-view .category-card:nth-child(2),
        .reveal-section.in-view .product-card:nth-child(2) { transition-delay: 0.12s; }

        .reveal-section.in-view .category-card:nth-child(3),
        .reveal-section.in-view .product-card:nth-child(3) { transition-delay: 0.19s; }

        .reveal-section.in-view .category-card:nth-child(4),
        .reveal-section.in-view .product-card:nth-child(4) { transition-delay: 0.26s; }

        .reveal-section.in-view .category-card:nth-child(5),
        .reveal-section.in-view .product-card:nth-child(5) { transition-delay: 0.33s; }

        .reveal-section.in-view .category-card:nth-child(6),
        .reveal-section.in-view .product-card:nth-child(6) { transition-delay: 0.40s; }

        .reveal-section.in-view .category-card:nth-child(n+7),
        .reveal-section.in-view .product-card:nth-child(n+7) { transition-delay: 0.45s; }

        .reveal-section .home-brand-image-wrap {
          opacity: 0;
          transform: translateX(28px);
          transition: opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.85s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform;
        }

        .reveal-section.in-view .home-brand-image-wrap {
          opacity: 1;
          transform: translateX(0);
          transition-delay: 0.18s;
        }

        .reveal-section .home-brand-text {
          opacity: 0;
          transform: translateX(-24px);
          transition: opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.85s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform;
        }

        .reveal-section.in-view .home-brand-text {
          opacity: 1;
          transform: translateX(0);
          transition-delay: 0.05s;
        }

        /* ---------------------------------------------------------------
           Categories grid
           --------------------------------------------------------------- */
        .home-categories-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .home-categories {
          display: grid;
          gap: 1.5rem;
        }

        .home-categories--editorial {
          grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
          margin-top: 2rem;
        }

        .category-card {
          position: relative;
          height: 420px;
          overflow: hidden;
          display: block;
          text-decoration: none;
          border: 1px solid #000000;
          border-radius: var(--radius-sm);
          transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .category-card--editorial:hover {
          transform: translateY(-4px);
        }

        .category-card-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center center;
          transition: transform 0.65s cubic-bezier(0.22, 1, 0.36, 1);
          display: block;
        }

        .category-card:hover .category-card-img {
          transform: scale(1.05);
        }

        .category-card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to top,
            rgba(0, 0, 0, 0.85) 0%,
            rgba(0, 0, 0, 0.15) 55%,
            transparent 100%
          );
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          color: #FFFFFF;
        }

        .category-card-number {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          letter-spacing: 0.2em;
          color: rgba(255, 255, 255, 0.75);
          margin-bottom: 0.5rem;
        }

        .category-card-title {
          font-family: var(--font-serif);
          font-size: 1.9rem;
          font-weight: 400;
          line-height: 1.1;
        }

        .category-card-desc {
          font-size: 0.83rem;
          color: rgba(255, 255, 255, 0.85);
          margin-top: 0.4rem;
          line-height: 1.45;
        }

        .category-card-cta {
          font-size: 0.72rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          margin-top: 1rem;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          opacity: 0.85;
          transition: opacity 0.3s ease, transform 0.3s ease;
        }

        .category-card:hover .category-card-cta {
          opacity: 1;
          transform: translateX(4px);
        }

        /* ---------------------------------------------------------------
           Brand story — black background, white text
           --------------------------------------------------------------- */
        .home-brand {
          background-color: #000000;
          color: #FFFFFF;
          padding: 7rem 0;
          border-bottom: 1px solid #000000;
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
          display: block;
          font-size: 0.72rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #FFFFFF;
          font-weight: 700;
          margin-bottom: 0.75rem;
        }

        .home-brand-heading {
          font-family: var(--font-serif);
          font-size: 2.6rem;
          margin: 0.5rem 0 1.5rem 0;
          font-weight: 400;
          line-height: 1.15;
          color: #FFFFFF;
        }

        .home-brand-para {
          color: #CCCCCC;
          font-size: 0.95rem;
          line-height: 1.85;
          margin-bottom: 1.4rem;
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
          height: 540px;
          object-fit: cover;
          object-position: center center;
          border-radius: var(--radius-sm);
          border: 1px solid #333333;
          display: block;
        }

        .home-brand-image-caption {
          display: inline-block;
          margin-top: 0.75rem;
          font-family: var(--font-mono);
          font-size: 0.68rem;
          letter-spacing: 0.2em;
          color: #767676;
          text-transform: uppercase;
        }

        /* ---------------------------------------------------------------
           Responsive — 900px (tablet)
           --------------------------------------------------------------- */
        @media (max-width: 900px) {
          .home-brand-inner {
            grid-template-columns: 1fr;
            gap: 2.5rem;
          }

          .reveal-section .home-brand-image-wrap {
            transform: translateY(24px);
          }

          .reveal-section.in-view .home-brand-image-wrap {
            transform: translateY(0);
          }

          .reveal-section .home-brand-text {
            transform: translateY(24px);
          }

          .reveal-section.in-view .home-brand-text {
            transform: translateY(0);
          }

          .home-brand-image {
            height: 380px;
          }
        }

        /* ---------------------------------------------------------------
           Responsive — 640px (mobile)
           --------------------------------------------------------------- */
        @media (max-width: 640px) {
          .home-section,
          .home-featured-dark,
          .home-brand {
            padding: 3.5rem 0;
          }

          .home-heading {
            font-size: 1.65rem;
            margin-bottom: 1.5rem;
          }

          .home-categories {
            gap: 1rem;
          }

          .category-card {
            height: 300px;
          }

          .category-card-overlay {
            padding: 1.1rem;
          }

          .category-card-title {
            font-size: 1.4rem;
          }

          .category-card-desc {
            font-size: 0.78rem;
          }

          .home-brand-heading {
            font-size: 1.8rem;
          }

          .home-brand-para {
            font-size: 0.88rem;
          }

          .home-brand-image {
            height: 280px;
          }

          .editorial-strip-item {
            font-size: 0.95rem;
          }

          .reveal-section {
            transform: translateY(22px);
          }

          .reveal-section .category-card,
          .reveal-section .product-card {
            transform: translateY(16px);
          }
        }

        /* ---------------------------------------------------------------
           Responsive — 400px (small phones)
           --------------------------------------------------------------- */
        @media (max-width: 400px) {
          .home-hero-title {
            font-size: 1.9rem;
          }

          .category-card {
            height: 240px;
          }

          .category-card-title {
            font-size: 1.15rem;
          }

          .home-brand-image {
            height: 220px;
          }
        }

        /* ---------------------------------------------------------------
           Reduced motion
           --------------------------------------------------------------- */
        @media (prefers-reduced-motion: reduce) {
          .home-hero-badge,
          .home-hero-title,
          .home-hero-sub,
          .home-hero-actions,
          .hero-slide--enter,
          .hero-slide--exit,
          .hero-slide-zoom,
          .editorial-strip-track,
          .reveal-section,
          .reveal-section.reveal-categories,
          .reveal-section .category-card,
          .reveal-section .product-card,
          .reveal-section .home-brand-image-wrap,
          .reveal-section .home-brand-text {
            animation: none !important;
            transition: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}