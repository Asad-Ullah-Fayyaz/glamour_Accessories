import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ShoppingBag, Search, User, Menu, X, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { selectCart, setIsCartOpen } from '../../store/slices/cartSlice';
import { fetchCategories, selectCategories, selectCategoriesLoading } from '../../store/slices/categoriesSlice';
import api from '../../services/api';
import logo from '../../images/logo.png';

export default function Navbar() {
  const dispatch = useDispatch();
  const { isAuthenticated, isAdmin, logout } = useAuth();
  const cart = useSelector(selectCart);
  const categories = useSelector(selectCategories);
  const categoriesLoading = useSelector(selectCategoriesLoading);
  const categoriesLoaded = !categoriesLoading;

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryDropdown, setActiveCategoryDropdown] = useState(null);

  // Announcement content — pulled from /api/site-content/homepage
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementEnabled, setAnnouncementEnabled] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  // Fetch announcement content
  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const res = await api.get('/site-content/homepage');
        if (res.success && res.content && res.content.announcement) {
          const { text, enabled } = res.content.announcement;
          if (typeof text === 'string' && text.trim()) {
            setAnnouncementText(text.trim());
          } else {
            setAnnouncementText('');
          }
          if (typeof enabled === 'boolean') {
            setAnnouncementEnabled(enabled);
          } else {
            setAnnouncementEnabled(false);
          }
        } else {
          setAnnouncementText('');
          setAnnouncementEnabled(false);
        }
      } catch (err) {
        setAnnouncementText('');
        setAnnouncementEnabled(false);
      }
    };
    fetchAnnouncement();
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Close drawers on Escape key
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsSearchOpen(false);
        setActiveCategoryDropdown(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <header
      className="navbar-header"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-light)',
        overflowX: 'clip',
        maxWidth: '100vw'
      }}
    >
      {/* Top Announcement Bar */}
      {announcementEnabled && announcementText && (
        <div
          style={{
            backgroundColor: 'var(--bg-dark)',
            color: 'lightgray',
            padding: '0.45rem 0',
            fontSize: '0.75rem',
            borderBottom: '1px solid var(--border-light)',
            fontWeight: 700,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            width: '100%',
            maxWidth: '100vw'
          }}
        >
          <div
            className="marquee-track"
            style={{
              display: 'flex',
              width: 'max-content',
              willChange: 'transform',
              animation: 'marqueeScroll 30s linear infinite'
            }}
          >
            {/* Group 1 — the visible copy at the start of the loop */}
            <div style={{ display: 'flex', flexShrink: 0 }}>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    paddingRight: '4rem',
                    flexShrink: 0
                  }}
                >
                  {announcementText}
                </span>
              ))}
            </div>

            {/* Group 2 — exact duplicate; this is what makes the loop seamless */}
            <div style={{ display: 'flex', flexShrink: 0 }} aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    paddingRight: '4rem',
                    flexShrink: 0
                  }}
                >
                  {announcementText}
                </span>
              ))}
            </div>
          </div>

          <style>{`
            /* Two identical groups sit side-by-side inside .marquee-track.
               We slide the whole track left by exactly 50% of its own
               width — which is exactly one group's width. At t=100% the
               second group is sitting where the first group started, so
               the browser's snap back to t=0 is visually invisible. */
            @keyframes marqueeScroll {
              0%   { transform: translate3d(0, 0, 0); }
              100% { transform: translate3d(-50%, 0, 0); }
            }
            .marquee-track:hover {
              animation-play-state: paused;
            }
          `}</style>
        </div>
      )}

      {/* Main Navigation Header — 3-column grid: logo | nav | icons */}
      <div
        className="container navbar-main"
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          alignItems: 'center',
          height: '80px',
          gap: '1rem'
        }}
      >
        {/* Brand Logo */}
        <Link
          to="/"
          className="logo-link"
          style={{
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            justifySelf: 'start'
          }}
        >
          <img
            src={logo}
            alt="AXI Collection Logo"
            className="logo-image"
            style={{
              height: '65px',
              width: 'auto',
              minWidth: '60px',
              objectFit: 'contain',
              display: 'block'
            }}
          />
        </Link>

        {/* Desktop Category Navigation Bar */}
        <nav
          className="desktop-nav"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.25rem',
            minWidth: 0
          }}
        >
          <Link
            to="/products"
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '0.45rem 0.6rem',
              whiteSpace: 'nowrap'
            }}
          >
            Shop All
          </Link>

          {!categoriesLoaded ? (
            <>
              <span style={{ width: '70px', height: '14px', display: 'inline-block' }} />
              <span style={{ width: '70px', height: '14px', display: 'inline-block' }} />
              <span style={{ width: '70px', height: '14px', display: 'inline-block' }} />
            </>
          ) : (
            categories.map((cat) => (
              <div
                key={cat._id}
                style={{
                  position: 'relative',
                  height: '80px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                onMouseEnter={() => setActiveCategoryDropdown(cat._id)}
                onMouseLeave={() => setActiveCategoryDropdown(null)}
              >
                <Link
                  to={`/products?category=${cat.slug}`}
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    padding: '0.45rem 0.6rem',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {cat.name}
                  {cat.subCategories && cat.subCategories.length > 0 && <ChevronDown size={12} />}
                </Link>

                {activeCategoryDropdown === cat._id &&
                  cat.subCategories &&
                  cat.subCategories.length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '80px',
                        left: '0',
                        minWidth: '220px',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-light)',
                        boxShadow: 'var(--shadow-dropdown)',
                        padding: '0.75rem 0',
                        zIndex: 1200,
                        borderRadius: 'var(--radius-sm)'
                      }}
                    >
                      {cat.subCategories.map((sub) => (
                        <Link
                          key={sub._id}
                          to={`/products?category=${cat.slug}&subCategory=${sub.slug}`}
                          style={{
                            display: 'block',
                            padding: '0.6rem 1.5rem',
                            fontSize: '0.8rem',
                            color: 'var(--text-secondary)',
                            transition: 'background-color var(--transition-fast)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#FFFFFF';
                            e.currentTarget.style.color = 'var(--text-primary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                          }}
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  )}
              </div>
            ))
          )}

          <Link
            to="/track-order"
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '0.45rem 0.6rem',
              whiteSpace: 'nowrap'
            }}
          >
            Track Order
          </Link>
        </nav>

        {/* Right — Mobile Menu + Action Icons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            flexShrink: 0,
            justifySelf: 'end'
          }}
        >
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{ display: 'none', color: 'var(--text-primary)' }}
            className="mobile-menu-btn"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            style={{ color: 'var(--text-primary)' }}
            aria-label="Search Catalog"
          >
            <Search size={20} />
          </button>

          <div style={{ position: 'relative' }} className="user-dropdown-container">
            <Link
              to={isAuthenticated ? (isAdmin ? '/admin' : '/profile') : '/login'}
              style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}
            >
              <User size={20} />
            </Link>
          </div>

          <button
            onClick={() => dispatch(setIsCartOpen(true))}
            style={{ position: 'relative', color: 'var(--text-primary)' }}
            aria-label="Open Shopping Bag"
          >
            <ShoppingBag size={20} />
            {cart.itemCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-6px',
                  backgroundColor: 'var(--bg-dark)',
                  color: '#FFFFFF',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {cart.itemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Expandable Search Drawer */}
      {isSearchOpen && (
        <div
          className="navbar-search-drawer"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-light)',
            padding: '1.25rem 0',
            boxShadow: 'var(--shadow-subtle)'
          }}
        >
          <div className="container">
            <form
              onSubmit={handleSearchSubmit}
              className="navbar-search-form"
              style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}
            >
              <input
                type="text"
                placeholder="Search watches, sunglasses, mobile accessories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ flex: 1, backgroundColor: '#FFFFFF', minWidth: 0 }}
                autoFocus
              />
              <button type="submit" className="btn btn-primary btn-sm">
                Search
              </button>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                style={{ color: 'var(--text-primary)', flexShrink: 0 }}
                aria-label="Close search"
              >
                <X size={20} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div
          className="navbar-mobile-drawer"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'var(--bg-secondary)',
            zIndex: 1500,
            padding: '2rem 1.5rem',
            overflowY: 'auto'
          }}
        >
          {/* Mobile Drawer Header with Close (X) Button */}
          <div
            className="navbar-mobile-drawer-header"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '1rem',
              marginBottom: '1.25rem',
              borderBottom: '1px solid var(--border-light)'
            }}
          >
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)'
              }}
            >
              Menu
            </span>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close navigation menu"
              className="navbar-mobile-close"
              style={{
                color: 'var(--text-primary)',
                padding: '0.4rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={24} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <Link
              to="/products"
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                fontSize: '1.1rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: 'var(--text-primary)'
              }}
            >
              Shop All
            </Link>
            {categories.map((cat) => (
              <div key={cat._id}>
                <Link
                  to={`/products?category=${cat.slug}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: 'var(--text-primary)'
                  }}
                >
                  {cat.name}
                </Link>
                {cat.subCategories && cat.subCategories.length > 0 && (
                  <div
                    style={{
                      paddingLeft: '1rem',
                      marginTop: '0.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}
                  >
                    {cat.subCategories.map((sub) => (
                      <Link
                        key={sub._id}
                        to={`/products?category=${cat.slug}&subCategory=${sub.slug}`}
                        onClick={() => setIsMobileMenuOpen(false)}
                        style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <hr
              style={{
                border: 'none',
                borderTop: '1px solid var(--border-light)'
              }}
            />
            <Link
              to="/track-order"
              onClick={() => setIsMobileMenuOpen(false)}
              style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}
            >
              Track Order
            </Link>
            {isAuthenticated ? (
              <>
                <Link
                  to={isAdmin ? '/admin' : '/profile'}
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}
                >
                  {isAdmin ? 'Admin Dashboard' : 'My Account & Orders'}
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                  }}
                  style={{ textAlign: 'left', fontSize: '1rem', color: '#C5221F' }}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}
              >
                Sign In / Register
              </Link>
            )}
          </div>
        </div>
      )}

      <style>{`
        /* === Responsive fixes only === */
        .navbar-main {
          /* ensure grid children can shrink */
        }
        .navbar-main > * {
          min-width: 0;
        }

        @media (max-width: 900px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }

        @media (max-width: 640px) {
          .navbar-main {
            height: 64px !important;
            gap: 0.5rem !important;
          }
          .navbar-main .logo-image {
            height: 52px !important;
            min-width: 48px !important;
          }
          .navbar-search-drawer {
            padding: 1rem 0 !important;
          }
          .navbar-search-form {
            flex-wrap: wrap !important;
          }
          .navbar-search-form .form-input {
            flex: 1 1 100% !important;
            width: 100% !important;
          }
          .navbar-search-form .btn {
            flex: 1;
            justify-content: center;
          }
          .navbar-mobile-drawer {
            padding: 1.25rem 1.25rem 1.5rem !important;
          }
          .navbar-mobile-drawer-header {
            padding-bottom: 0.75rem !important;
            margin-bottom: 1rem !important;
          }
        }

        @media (max-width: 380px) {
          .navbar-main {
            height: 60px !important;
          }
          .navbar-main .logo-image {
            height: 46px !important;
          }
          .navbar-mobile-drawer {
            padding: 1rem 1rem 1.25rem !important;
          }
        }
      `}</style>
    </header>
  );
}