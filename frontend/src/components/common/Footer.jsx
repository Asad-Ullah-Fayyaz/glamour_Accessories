import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Truck, RotateCcw, Clock } from 'lucide-react';

export default function Footer() {
  const navigate = useNavigate();

  const goTo = (path) => {
    navigate(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLinkClick = (path, e) => {
    e.preventDefault();
    goTo(path);
  };

  return (
    <footer
      style={{
        backgroundColor: '#000000',
        color: '#FFFFFF',
        paddingTop: '4rem',
        paddingBottom: '2rem',
        marginTop: '6rem',
        borderTop: '1px solid #000000'
      }}
    >
      {/* Brand Value Pillars */}
      <div
        className="container"
        style={{
          borderBottom: '1px solid #333333',
          paddingBottom: '3rem',
          marginBottom: '3rem'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '2rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Truck size={28} style={{ color: '#FFFFFF' }} />
            <div>
              <h4
                style={{
                  fontSize: '0.85rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#FFFFFF'
                }}
              >
                Express Delivery
              </h4>
              <p style={{ fontSize: '0.75rem', color: '#AAAAAA', marginTop: '2px' }}>
                Nationwide Cash on Delivery
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <ShieldCheck size={28} style={{ color: '#FFFFFF' }} />
            <div>
              <h4
                style={{
                  fontSize: '0.85rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#FFFFFF'
                }}
              >
                Guaranteed Quality
              </h4>
              <p style={{ fontSize: '0.75rem', color: '#AAAAAA', marginTop: '2px' }}>
                100% Authentic Product Craft
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <RotateCcw size={28} style={{ color: '#FFFFFF' }} />
            <div>
              <h4
                style={{
                  fontSize: '0.85rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#FFFFFF'
                }}
              >
                Hassle-Free Inspection
              </h4>
              <p style={{ fontSize: '0.75rem', color: '#AAAAAA', marginTop: '2px' }}>
                Inspect package upon delivery
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Clock size={28} style={{ color: '#FFFFFF' }} />
            <div>
              <h4
                style={{
                  fontSize: '0.85rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#FFFFFF'
                }}
              >
                Dedicated Concierge
              </h4>
              <p style={{ fontSize: '0.75rem', color: '#AAAAAA', marginTop: '2px' }}>
                Support Mon-Sat 9AM-8PM
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links — 4 columns */}
      <div
        className="container footer-links-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '1.7fr 1fr 1fr 1.2fr',
          gap: '3rem',
          borderBottom: '1px solid #333333',
          paddingBottom: '3rem'
        }}
      >
        {/* Brand Narrative */}
        <div>
          <h3
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.4rem',
              letterSpacing: '0.1em',
              marginBottom: '1rem',
              color: '#FFFFFF'
            }}
          >
            GLAMOUR ACCESSORIES
          </h3>
          <p
            style={{
              fontSize: '0.85rem',
              color: '#CCCCCC',
              lineHeight: '1.7',
              maxWidth: '360px',
              marginBottom: '1rem'
            }}
          >
            Glamour Accessories is a contemporary house of refined lifestyle accessories. We design
            and curate luxury timepieces, optical eyewear, and minimalist technical gear for
            discerning individuals.
          </p>
          <p
            style={{
              fontSize: '0.75rem',
              color: '#AAAAAA',
              lineHeight: '1.6'
            }}
          >
            All products are sourced directly and pass a multi-point quality inspection before
            dispatch. Cash on Delivery available across Pakistan.
          </p>
        </div>

        {/* Collections */}
        <div>
          <h4
            style={{
              fontSize: '0.75rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: '1.25rem',
              color: '#AAAAAA'
            }}
          >
            Collections
          </h4>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              fontSize: '0.85rem'
            }}
          >
            <li>
              <Link
                to="/products?category=watches"
                onClick={(e) => handleLinkClick('/products?category=watches', e)}
                style={{ color: '#CCCCCC', transition: 'color 0.3s ease' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#CCCCCC')}
              >
                Timepieces & Watches
              </Link>
            </li>
            <li>
              <Link
                to="/products?category=glasses"
                onClick={(e) => handleLinkClick('/products?category=glasses', e)}
                style={{ color: '#CCCCCC', transition: 'color 0.3s ease' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#CCCCCC')}
              >
                Eyewear & Sunglasses
              </Link>
            </li>
            <li>
              <Link
                to="/products?category=mobile-accessories"
                onClick={(e) => handleLinkClick('/products?category=mobile-accessories', e)}
                style={{ color: '#CCCCCC', transition: 'color 0.3s ease' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#CCCCCC')}
              >
                Mobile Accessories
              </Link>
            </li>
            <li>
              <Link
                to="/products"
                onClick={(e) => handleLinkClick('/products', e)}
                style={{ color: '#CCCCCC', transition: 'color 0.3s ease' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#CCCCCC')}
              >
                All Products
              </Link>
            </li>
          </ul>
        </div>

        {/* Client Services */}
        <div>
          <h4
            style={{
              fontSize: '0.75rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: '1.25rem',
              color: '#AAAAAA'
            }}
          >
            Client Services
          </h4>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              fontSize: '0.85rem'
            }}
          >
            <li>
              <Link
                to="/track-order"
                onClick={(e) => handleLinkClick('/track-order', e)}
                style={{ color: '#CCCCCC', transition: 'color 0.3s ease' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#CCCCCC')}
              >
                Track Your Order
              </Link>
            </li>
            <li>
              <Link
                to="/products"
                onClick={(e) => handleLinkClick('/products', e)}
                style={{ color: '#CCCCCC', transition: 'color 0.3s ease' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#CCCCCC')}
              >
                Shop New Arrivals
              </Link>
            </li>
            <li>
              <Link
                to="/login"
                onClick={(e) => handleLinkClick('/login', e)}
                style={{ color: '#CCCCCC', transition: 'color 0.3s ease' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#CCCCCC')}
              >
                My Account
              </Link>
            </li>
            <li>
              <Link
                to="/profile"
                onClick={(e) => handleLinkClick('/profile', e)}
                style={{ color: '#CCCCCC', transition: 'color 0.3s ease' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#CCCCCC')}
              >
                Order History
              </Link>
            </li>
          </ul>
        </div>

        {/* Legal & Policies */}
        <div>
          <h4
            style={{
              fontSize: '0.75rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: '1.25rem',
              color: '#AAAAAA'
            }}
          >
            Legal & Policies
          </h4>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              fontSize: '0.85rem'
            }}
          >
            <li>
              <Link
                to="/returns-policy"
                onClick={(e) => handleLinkClick('/returns-policy', e)}
                style={{ color: '#CCCCCC', transition: 'color 0.3s ease' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#CCCCCC')}
              >
                Returns & Replacement
              </Link>
            </li>
            <li>
              <Link
                to="/shipping-policy"
                onClick={(e) => handleLinkClick('/shipping-policy', e)}
                style={{ color: '#CCCCCC', transition: 'color 0.3s ease' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#CCCCCC')}
              >
                Shipping & Delivery
              </Link>
            </li>
            <li>
              <Link
                to="/privacy-policy"
                onClick={(e) => handleLinkClick('/privacy-policy', e)}
                style={{ color: '#CCCCCC', transition: 'color 0.3s ease' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#CCCCCC')}
              >
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link
                to="/terms"
                onClick={(e) => handleLinkClick('/terms', e)}
                style={{ color: '#CCCCCC', transition: 'color 0.3s ease' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#CCCCCC')}
              >
                Terms & Conditions
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Policy Highlights Strip */}
      <div
        className="container"
        style={{
          paddingTop: '2rem',
          paddingBottom: '1.5rem',
          borderBottom: '1px solid #333333'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.25rem',
            fontSize: '0.75rem',
            color: '#AAAAAA',
            lineHeight: '1.6'
          }}
        >
          <div>
            <div
              style={{
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#FFFFFF',
                marginBottom: '0.35rem',
                fontSize: '0.7rem'
              }}
            >
              Authenticity Guaranteed
            </div>
            Every Glamour product is inspected for authenticity and finish before it leaves our
            facility. We do not sell replicas or refurbished items.
          </div>
          <div>
            <div
              style={{
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#FFFFFF',
                marginBottom: '0.35rem',
                fontSize: '0.7rem'
              }}
            >
              Replacement Policy
            </div>
            If your order arrives incorrect, damaged, or broken, contact us within 48 hours for
            a replacement. Cash refunds are not available.
          </div>
          <div>
            <div
              style={{
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#FFFFFF',
                marginBottom: '0.35rem',
                fontSize: '0.7rem'
              }}
            >
              Inspect Before You Pay
            </div>
            Open your parcel and inspect the contents in front of the courier agent before
            completing Cash on Delivery payment.
          </div>
        </div>
      </div>

      {/* Copyright Bar */}
      <div
        className="container"
        style={{
          paddingTop: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          color: '#AAAAAA',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <p style={{ margin: 0 }}>
          &copy; {new Date().getFullYear()} Glamour Accessories. All rights reserved.
        </p>
        <p style={{ margin: 0, letterSpacing: '0.05em' }}>
          Designed &amp; Curated in Pakistan.
        </p>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .footer-links-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 600px) {
          .footer-links-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </footer>
  );
}