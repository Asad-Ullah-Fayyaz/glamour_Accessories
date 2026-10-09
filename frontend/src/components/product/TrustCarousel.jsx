import React, { useState, useRef, useEffect } from 'react';
import { Star, Play, X, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { toAbsoluteUrl } from '../../services/api';

export default function TrustCarousel({
  media,
  title = 'Real Customer Moments'
}) {
  const items = Array.isArray(media) ? media.filter((m) => m && m.url) : [];

  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [paused, setPaused] = useState(false);
  const [slideWidth, setSlideWidth] = useState(280);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1440
  );

  const marqueeRef = useRef(null);
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  const totalItems = items.length;

  // -------------------- responsive slide width + viewport --------------------
  useEffect(() => {
    const updateDimensions = () => {
      const w = window.innerWidth;
      setViewportWidth(w);
      if (w <= 380) setSlideWidth(180);
      else if (w <= 480) setSlideWidth(200);
      else if (w <= 640) setSlideWidth(220);
      else if (w <= 900) setSlideWidth(240);
      else if (w <= 1200) setSlideWidth(270);
      else if (w <= 1600) setSlideWidth(300);
      else setSlideWidth(320);
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // -------------------- keyboard (lightbox) --------------------
  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      else if (e.key === 'ArrowRight')
        setLightboxIndex((i) => (i === null ? i : (i + 1) % totalItems));
      else if (e.key === 'ArrowLeft')
        setLightboxIndex((i) =>
          i === null ? i : (i - 1 + totalItems) % totalItems
        );
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxIndex, totalItems]);

  // -------------------- swipe (mobile — lightbox nav) --------------------
  const handleTouchStart = (e) => {
    touchStartX.current = e.changedTouches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const dx = (touchStartX.current || 0) - (touchEndX.current || 0);
    if (lightboxIndex !== null && Math.abs(dx) > 40) {
      if (dx > 0) setLightboxIndex((i) => (i + 1) % totalItems);
      else setLightboxIndex((i) => (i - 1 + totalItems) % totalItems);
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (items.length === 0) return null;

  // ============================================================
  // MARQUEE COPIES CALCULATION — the fix for wide screens
  // ============================================================
  // One cycle = one full set of items (each item's width + gap).
  const gap = 16;
  const cyclePx = items.length * (slideWidth + gap);

  // We need enough copies so the TOTAL track width is at least 3× the
  // viewport width. This guarantees a seamless loop on any screen,
  // including 4K and ultrawide monitors.
  const copiesNeeded = Math.max(
    3,
    Math.ceil((viewportWidth * 3) / cyclePx)
  );

  // Build the track by repeating the items array copiesNeeded times.
  const marqueeItems = [];
  for (let c = 0; c < copiesNeeded; c += 1) {
    for (let i = 0; i < items.length; i += 1) {
      marqueeItems.push({ ...items[i], __key: `${c}-${i}` });
    }
  }

  // Duration scales with cycle width so the speed feels consistent
  // regardless of screen size or item count.
  const loopDurationSec = Math.max(25, items.length * 6);

  return (
    <section
      className="trust-carousel"
      aria-label="Customer trust media"
      style={{ marginTop: '4rem' }}
    >
      {/* ============ 7-DAY RETURN BANNER ============ */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0D7A3E 0%, #16A34A 100%)',
          color: '#FFFFFF',
          padding: '1.5rem 1.25rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          border: '2px solid #0A5E30',
          boxShadow: '0 8px 24px rgba(13, 122, 62, 0.15)'
        }}
      >
        <div
          style={{
            flexShrink: 0,
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <RotateCcw size={26} strokeWidth={2.5} />
        </div>
        <div style={{ minWidth: 0, flex: '1 1 200px' }}>
          <div
            style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              letterSpacing: '-0.01em',
              lineHeight: 1.15,
              marginBottom: '0.2rem',
              fontFamily: 'var(--font-serif)'
            }}
          >
            7 Days Easy Return
          </div>
          <div
            style={{
              fontSize: '0.9rem',
              lineHeight: 1.5,
              opacity: 0.95,
              fontWeight: 500
            }}
          >
            Don't like it? Just return it. No questions asked.
          </div>
        </div>
      </div>

      {/* ============ SECTION HEADER ============ */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <span
            style={{
              fontSize: '0.72rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#767676',
              fontWeight: 700
            }}
          >
            REAL CUSTOMER MOMENTS
          </span>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(1.35rem, 3vw, 1.75rem)',
              fontWeight: 400,
              margin: '0.25rem 0 0 0',
              color: '#000000'
            }}
          >
            {title}
          </h2>
        </div>
        <span
          style={{
            fontSize: '0.75rem',
            color: '#767676',
            fontStyle: 'italic'
          }}
        >
          {items.length} {items.length === 1 ? 'moment' : 'moments'} from real buyers
        </span>
      </div>

      {/* ============ MARQUEE TRACK ============ */}
      <div
        ref={marqueeRef}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          overflow: 'hidden',
          width: '100%',
          position: 'relative',
          paddingBottom: '0.5rem',
          // Wider fade on both edges — hides the seam better on wide screens
          maskImage:
            'linear-gradient(to right, transparent 0, #000 80px, #000 calc(100% - 80px), transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to right, transparent 0, #000 80px, #000 calc(100% - 80px), transparent 100%)'
        }}
      >
        <div
          className="trust-marquee-inner"
          style={{
            display: 'flex',
            gap: `${gap}px`,
            width: 'max-content',
            animation: `trustMarqueeScroll ${loopDurationSec}s linear infinite`,
            animationPlayState: paused ? 'paused' : 'running',
            '--cycle-width': `${cyclePx}px`
          }}
        >
          {marqueeItems.map((item, i) => (
            <div
              key={item.__key}
              style={{
                width: slideWidth,
                flexShrink: 0
              }}
            >
              <TrustSlide
                item={item}
                onOpen={() => setLightboxIndex(i % items.length)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ============ LIGHTBOX ============ */}
      {lightboxIndex !== null && items[lightboxIndex] && (
        <Lightbox
          item={items[lightboxIndex]}
          onClose={() => setLightboxIndex(null)}
          onPrev={() =>
            setLightboxIndex((i) => (i - 1 + totalItems) % totalItems)
          }
          onNext={() => setLightboxIndex((i) => (i + 1) % totalItems)}
          index={lightboxIndex}
          total={totalItems}
        />
      )}

      <style>{`
        @keyframes trustMarqueeScroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(calc(-1 * var(--cycle-width)));
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .trust-marquee-inner {
            animation: none !important;
            overflow-x: auto;
          }
        }

        @media (max-width: 480px) {
          .trust-carousel {
            margin-top: 3rem !important;
          }
        }
      `}</style>
    </section>
  );
}

/* --------------------------------------------------------------------- */
/* Single slide                                                          */
/* --------------------------------------------------------------------- */
function TrustSlide({ item, onOpen }) {
  const isVideo = item.type === 'video';
  const videoRef = useRef(null);

  useEffect(() => {
    if (!isVideo) return;
    const el = videoRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      el.play().catch(() => {});
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.play().catch(() => {});
          } else {
            el.pause();
          }
        });
      },
      { threshold: 0.35 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isVideo]);

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        display: 'block',
        width: '100%',
        border: '1px solid #E0E0E0',
        background: '#FFFFFF',
        padding: 0,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
      aria-label={isVideo ? 'Play customer video' : 'View customer photo'}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '4 / 5',
          backgroundColor: '#EDEDED',
          overflow: 'hidden'
        }}
      >
        {isVideo ? (
          <>
            <video
              ref={videoRef}
              src={toAbsoluteUrl(item.url)}
              muted
              loop
              playsInline
              preload="metadata"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block'
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background:
                  'linear-gradient(rgba(0,0,0,0.02), rgba(0,0,0,0.3))',
                pointerEvents: 'none'
              }}
            >
              <span
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  border: '2px solid #FFFFFF'
                }}
              >
                <Play size={22} fill="#FFFFFF" style={{ marginLeft: 3 }} />
              </span>
            </div>
          </>
        ) : (
          <img
            src={toAbsoluteUrl(item.url)}
            alt={item.caption || item.customerName || 'Customer photo'}
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block'
            }}
          />
        )}

        {isVideo && (
          <span
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              fontSize: '0.6rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '3px 7px',
              background: 'rgba(0,0,0,0.75)',
              color: '#FFFFFF'
            }}
          >
            Video
          </span>
        )}
      </div>

      <div style={{ padding: '0.75rem 0.85rem 0.9rem' }}>
        {item.rating ? (
          <div style={{ display: 'flex', gap: 2, marginBottom: '0.35rem' }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                size={12}
                fill={n <= item.rating ? '#C5A059' : 'none'}
                color={n <= item.rating ? '#C5A059' : '#CCCCCC'}
              />
            ))}
          </div>
        ) : null}

        {item.caption ? (
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '0.85rem',
              fontStyle: 'italic',
              color: '#000000',
              lineHeight: 1.45,
              margin: '0 0 0.4rem 0',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            “{item.caption}”
          </p>
        ) : null}

        {(item.customerName || item.city) && (
          <div
            style={{
              fontSize: '0.72rem',
              color: '#767676',
              display: 'flex',
              gap: '0.35rem',
              alignItems: 'baseline',
              flexWrap: 'wrap'
            }}
          >
            {item.customerName && (
              <strong style={{ color: '#000000', fontWeight: 600 }}>
                {item.customerName}
              </strong>
            )}
            {item.customerName && item.city && <span>·</span>}
            {item.city && <span>{item.city}</span>}
          </div>
        )}
      </div>
    </button>
  );
}

/* --------------------------------------------------------------------- */
/* Lightbox                                                              */
/* --------------------------------------------------------------------- */
function Lightbox({ item, onClose, onPrev, onNext, index, total }) {
  const isVideo = item.type === 'video';

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 4000,
        background: 'rgba(0,0,0,0.94)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.14)',
          color: '#FFFFFF',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2
        }}
      >
        <X size={22} />
      </button>

      {total > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          aria-label="Previous"
          style={{
            position: 'absolute',
            left: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.14)',
            color: '#FFFFFF',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2
          }}
        >
          <ChevronLeft size={22} />
        </button>
      )}

      {total > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          aria-label="Next"
          style={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.14)',
            color: '#FFFFFF',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2
          }}
        >
          <ChevronRight size={22} />
        </button>
      )}

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 'min(900px, 92vw)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%'
        }}
      >
        {isVideo ? (
          <video
            src={toAbsoluteUrl(item.url)}
            controls
            autoPlay
            playsInline
            style={{
              maxWidth: '100%',
              maxHeight: '70vh',
              background: '#000',
              display: 'block',
              width: 'auto'
            }}
          />
        ) : (
          <img
            src={toAbsoluteUrl(item.url)}
            alt={item.caption || item.customerName || 'Customer photo'}
            style={{
              maxWidth: '100%',
              maxHeight: '70vh',
              objectFit: 'contain',
              display: 'block'
            }}
          />
        )}

        {(item.caption || item.customerName || item.city || item.rating) && (
          <div
            style={{
              marginTop: '1rem',
              color: '#FFFFFF',
              textAlign: 'center',
              maxWidth: 640,
              padding: '0 1rem'
            }}
          >
            {item.rating ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 3,
                  marginBottom: '0.5rem'
                }}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    size={16}
                    fill={n <= item.rating ? '#C5A059' : 'none'}
                    color={n <= item.rating ? '#C5A059' : '#666'}
                  />
                ))}
              </div>
            ) : null}
            {item.caption ? (
              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                  fontSize: '1rem',
                  lineHeight: 1.6,
                  margin: '0 0 0.5rem 0'
                }}
              >
                “{item.caption}”
              </p>
            ) : null}
            {(item.customerName || item.city) && (
              <div style={{ fontSize: '0.8rem', color: '#AAAAAA' }}>
                {item.customerName}
                {item.customerName && item.city ? ' · ' : ''}
                {item.city}
              </div>
            )}
          </div>
        )}

        <div
          style={{
            marginTop: '0.75rem',
            fontSize: '0.7rem',
            letterSpacing: '0.15em',
            color: '#888888'
          }}
        >
          {index + 1} / {total}
        </div>
      </div>
    </div>
  );
}