import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ShoppingBag,
  Search,
  User,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { selectCart, setIsCartOpen } from '../../store/slices/cartSlice';
import {
  fetchCategories,
  selectCategories,
  selectCategoriesLoading
} from '../../store/slices/categoriesSlice';
import api from '../../services/api';
import logo from '../../images/glamour-logo.png';

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

  // Mobile drill-down stack: array of node objects (L1, then L2, then L3)
  const [mobilePath, setMobilePath] = useState([]);

  const [announcementText, setAnnouncementText] = useState('');
  const [announcementEnabled, setAnnouncementEnabled] = useState(false);

  const [isScrolled, setIsScrolled] = useState(false);

  const closeTimer = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();

  const isHomePage = location.pathname === '/';
  const isTransparent =
    isHomePage && !isScrolled && !isMobileMenuOpen && !isSearchOpen;

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const res = await api.get('/site-content/homepage');
        if (res.success && res.content && res.content.announcement) {
          const { text, enabled } = res.content.announcement;
          setAnnouncementText(typeof text === 'string' ? text.trim() : '');
          setAnnouncementEnabled(typeof enabled === 'boolean' ? enabled : false);
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

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Reset the drill-down stack whenever the drawer is opened/closed
  useEffect(() => {
    setMobilePath([]);
  }, [isMobileMenuOpen]);

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

  const openDropdown = (id) => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setActiveCategoryDropdown(id);
  };
  const closeDropdown = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setActiveCategoryDropdown(null);
    }, 120);
  };

  const fg = isTransparent ? '#ffffff' : '#000000';
  const headerBg = isTransparent ? 'transparent' : '#ffffff';
  const headerBorder = isTransparent
    ? '1px solid transparent'
    : '1px solid #E0E0E0';

  const hasChildren = (node) => Array.isArray(node.children) && node.children.length > 0;

  // -------- Mobile drill-down helpers --------

  const pushMobileNode = (node) => {
    if (!hasChildren(node)) {
      navigate(`/products?category=${node.slug}`);
      setIsMobileMenuOpen(false);
      return;
    }
    setMobilePath((prev) => [...prev, node]);
  };

  const popMobileNode = () => {
    setMobilePath((prev) => prev.slice(0, -1));
  };

  const currentMobileNode = mobilePath.length > 0 ? mobilePath[mobilePath.length - 1] : null;
  const currentMobileItems = currentMobileNode ? currentMobileNode.children || [] : categories;
  const mobileDepth = mobilePath.length;

  const mobileScreenTitle =
    mobileDepth === 0 ? 'Menu' : currentMobileNode.name;

  return (
    <header
      className={`navbar-header${announcementEnabled && announcementText ? ' has-announcement' : ''}`}
      style={{
        position: 'fixed',
        top: 0,
        zIndex: 1000,
        backgroundColor: headerBg,
        borderBottom: headerBorder,
        width: '100%',
        transition:
          'background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease',
        color: fg
      }}
    >
      {/* Announcement bar */}
      {announcementEnabled && announcementText && (
        <div
          style={{
            backgroundColor: '#000000',
            color: '#FFFFFF',
            padding: '0.45rem 0',
            fontSize: '0.75rem',
            borderBottom: '1px solid #000000',
            fontWeight: 700,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            width: '100%'
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
            @keyframes marqueeScroll {
              0%   { transform: translate3d(0, 0, 0); }
              100% { transform: translate3d(-50%, 0, 0); }
            }
            .marquee-track:hover { animation-play-state: paused; }
          `}</style>
        </div>
      )}

      {/* Main nav */}
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
            src={logo}            alt="Glamour Accessories Logo"
            className="logo-image"
            style={{
              height: '65px',
              width: 'auto',
              minWidth: '60px',
              objectFit: 'contain',
              display: 'block',
               filter: isTransparent ? 'brightness(0) invert(1)' : 'brightness(0)',
              transition: 'filter 0.3s ease'
            }}
          />
        </Link>

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
              whiteSpace: 'nowrap',
              color: fg,
              transition: 'color 0.3s ease'
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
                onMouseEnter={() => openDropdown(cat._id)}
                onMouseLeave={closeDropdown}
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
                    whiteSpace: 'nowrap',
                    color: fg,
                    transition: 'color 0.3s ease'
                  }}
                >
                  {cat.name}
                  {hasChildren(cat) && <ChevronDown size={12} />}
                </Link>

                {activeCategoryDropdown === cat._id && hasChildren(cat) && (
                  <div
                    className="mega-panel"
                    style={{
                      position: 'absolute',
                      top: '80px',
                      left: 0,
                      minWidth: '260px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #000000',
                      boxShadow: 'var(--shadow-dropdown)',
                      padding: '0.5rem 0',
                      zIndex: 1200,
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {cat.children.map((l2) => {
                        const l2HasChildren = hasChildren(l2);
                        return (
                          <div
                            key={l2._id}
                            className="mega-panel-item"
                            style={{ position: 'relative' }}
                          >
                            <Link
                              to={`/products?category=${l2.slug}`}
                              className="mega-panel-link"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '1rem',
                                padding: '0.65rem 1.25rem',
                                fontSize: '0.82rem',
                                color: '#444444',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <span>{l2.name}</span>
                              {l2HasChildren && (
                                <ChevronRight
                                  size={14}
                                  className="mega-panel-arrow"
                                  style={{ opacity: 0.7 }}
                                />
                              )}
                            </Link>

                            {l2HasChildren && (
                              <div
                                className="mega-subpanel"
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: '100%',
                                  minWidth: '220px',
                                  backgroundColor: '#FFFFFF',
                                  border: '1px solid #000000',
                                  boxShadow: 'var(--shadow-dropdown)',
                                  padding: '0.5rem 0',
                                  borderRadius: 'var(--radius-sm)',
                                  zIndex: 1300
                                }}
                              >
                                {l2.children.map((l3) => (
                                  <Link
                                    key={l3._id}
                                    to={`/products?category=${l3.slug}`}
                                    className="mega-panel-link"
                                    style={{
                                      display: 'block',
                                      padding: '0.55rem 1.25rem',
                                      fontSize: '0.8rem',
                                      color: '#444444'
                                    }}
                                  >
                                    {l3.name}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
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
              whiteSpace: 'nowrap',
              color: fg,
              transition: 'color 0.3s ease'
            }}
          >
            Track Order
          </Link>
        </nav>

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
            style={{ display: 'none', color: fg }}
            className="mobile-menu-btn"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            style={{ color: fg }}
            aria-label="Search Catalog"
          >
            <Search size={20} />
          </button>

          <div style={{ position: 'relative' }} className="user-dropdown-container">
            <Link
              to={isAuthenticated ? (isAdmin ? '/admin' : '/profile') : '/login'}
              style={{ color: fg, display: 'flex', alignItems: 'center' }}
            >
              <User size={20} />
            </Link>
          </div>

          <button
            onClick={() => dispatch(setIsCartOpen(true))}
            style={{ position: 'relative', color: fg }}
            aria-label="Open Shopping Bag"
          >
            <ShoppingBag size={20} />
            {cart.itemCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-6px',
                  backgroundColor: isTransparent ? '#FFFFFF' : '#000000',
                  color: isTransparent ? '#000000' : '#FFFFFF',
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

      {/* Search drawer */}
      {isSearchOpen && (
        <div
          style={{
            backgroundColor: '#F5F5F5',
            borderBottom: '1px solid #000000',
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
                style={{
                  flex: 1,
                  backgroundColor: '#FFFFFF',
                  minWidth: 0,
                  color: '#000000'
                }}
                autoFocus
              />
              <button type="submit" className="btn btn-primary btn-sm">
                Search
              </button>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                style={{ color: '#000000', flexShrink: 0 }}
                aria-label="Close search"
              >
                <X size={20} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile drawer */}
      {isMobileMenuOpen && (
        <div
          className="navbar-mobile-drawer"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#FFFFFF',
            zIndex: 1500,
            display: 'flex',
            flexDirection: 'column',
            color: '#000000'
          }}
        >
          {/* Header with Back button + title + close */}
          <div
            className="navbar-mobile-drawer-header"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #000000',
              flexShrink: 0,
              gap: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
              {mobileDepth > 0 && (
                <button
                  onClick={popMobileNode}
                  aria-label="Back"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.4rem',
                    color: '#000000',
                    flexShrink: 0
                  }}
                >
                  <ArrowLeft size={22} />
                </button>
              )}
              <span
                style={{
                  fontSize: mobileDepth === 0 ? '0.8rem' : '1rem',
                  fontWeight: mobileDepth === 0 ? 700 : 600,
                  letterSpacing: mobileDepth === 0 ? '0.15em' : '0.02em',
                  textTransform: mobileDepth === 0 ? 'uppercase' : 'none',
                  color: mobileDepth === 0 ? '#767676' : '#000000',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0
                }}
              >
                {mobileScreenTitle}
              </span>
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close menu"
              style={{
                color: '#000000',
                padding: '0.4rem',
                flexShrink: 0
              }}
            >
              <X size={24} />
            </button>
          </div>

          {/* Body */}
          <div
            className="navbar-mobile-drawer-body"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.25rem 1.5rem 2rem'
            }}
          >
            {/* Breadcrumb hint (L1 / L2 >) */}
            {mobileDepth > 0 && (
              <div
                style={{
                  fontSize: '0.7rem',
                  color: '#767676',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '1.25rem'
                }}
              >
                {mobilePath.map((n) => n.name).join(' / ')}
              </div>
            )}

            {/* DEPTH 0: Show top-level links + L1 list */}
            {mobileDepth === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <Link
                  to="/products"
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 0',
                    fontSize: '1.05rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: '#000000',
                    borderBottom: '1px solid #E0E0E0'
                  }}
                >
                  <span>Shop All</span>
                  <ChevronRight size={18} style={{ color: '#767676' }} />
                </Link>

                {categories.map((l1) => {
                  const l1HasChildren = hasChildren(l1);
                  return (
                    <button
                      key={l1._id}
                      onClick={() => pushMobileNode(l1)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.85rem 0',
                        fontSize: '1.05rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        color: '#000000',
                        borderBottom: '1px solid #E0E0E0',
                        textAlign: 'left',
                        background: 'transparent',
                        width: '100%'
                      }}
                    >
                      <span>{l1.name}</span>
                      {l1HasChildren && (
                        <ChevronRight size={18} style={{ color: '#767676' }} />
                      )}
                    </button>
                  );
                })}

                <Link
                  to="/track-order"
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 0',
                    fontSize: '1rem',
                    color: '#444444',
                    borderBottom: '1px solid #E0E0E0'
                  }}
                >
                  <span>Track Order</span>
                  <ChevronRight size={18} style={{ color: '#767676' }} />
                </Link>

                {isAuthenticated ? (
                  <>
                    <Link
                      to={isAdmin ? '/admin' : '/profile'}
                      onClick={() => setIsMobileMenuOpen(false)}
                      style={{
                        padding: '0.85rem 0',
                        fontSize: '1rem',
                        color: '#444444'
                      }}
                    >
                      {isAdmin ? 'Admin Dashboard' : 'My Account & Orders'}
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setIsMobileMenuOpen(false);
                      }}
                      style={{
                        textAlign: 'left',
                        fontSize: '1rem',
                        color: '#000000',
                        padding: '0.85rem 0',
                        fontWeight: 600
                      }}
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{
                      padding: '0.85rem 0',
                      fontSize: '1rem',
                      color: '#444444'
                    }}
                  >
                    Sign In / Register
                  </Link>
                )}
              </div>
            )}

            {/* DEPTH 1 & 2: Show children of the current node */}
            {mobileDepth > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {currentMobileItems.length === 0 ? (
                  <p
                    style={{
                      fontSize: '0.9rem',
                      color: '#767676',
                      fontStyle: 'italic'
                    }}
                  >
                    No sub-categories.
                  </p>
                ) : (
                  currentMobileItems.map((item) => {
                    const itemHasChildren = hasChildren(item);
                    return (
                      <button
                        key={item._id}
                        onClick={() => pushMobileNode(item)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.85rem 0',
                          fontSize: '1rem',
                          fontWeight: itemHasChildren ? 600 : 400,
                          color: '#000000',
                          borderBottom: '1px solid #E0E0E0',
                          textAlign: 'left',
                          background: 'transparent',
                          width: '100%'
                        }}
                      >
                        <span>{item.name}</span>
                        {itemHasChildren && (
                          <ChevronRight size={18} style={{ color: '#767676' }} />
                        )}
                      </button>
                    );
                  })
                )}

                <Link
                  to={`/products?category=${currentMobileNode.slug}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 0',
                    marginTop: '0.5rem',
                    fontSize: '0.9rem',
                    color: '#000000',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    textDecoration: 'underline'
                  }}
                >
                  <span>View all in {currentMobileNode.name}</span>
                  <ChevronRight size={16} />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .navbar-main > * { min-width: 0; }

        /* ---------- Desktop mega-panel animations ---------- */
        .mega-panel {
          animation: megaFade 180ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        @keyframes megaFade {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .mega-panel-link {
          transition: background-color 140ms ease, color 140ms ease, padding-left 140ms ease;
        }
        .mega-panel-link:hover {
          background-color: #000000;
          color: #FFFFFF !important;
          padding-left: 1.5rem !important;
        }

        .mega-subpanel { display: none; }
        .mega-panel-item:hover > .mega-subpanel {
          display: block;
          animation: megaFade 160ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .mega-panel-item:hover > .mega-panel-link {
          background-color: #000000;
          color: #FFFFFF !important;
        }
        .mega-panel-item:hover > .mega-panel-link .mega-panel-arrow {
          transform: translateX(2px);
          transition: transform 140ms ease;
        }

        /* ---------- Mobile drawer slide-in ---------- */
        .navbar-mobile-drawer {
          animation: mobileDrawerIn 260ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        @keyframes mobileDrawerIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ---------- Responsive ---------- */
        @media (max-width: 900px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
        @media (max-width: 640px) {
          .navbar-main { height: 64px !important; gap: 0.5rem !important; }
          .navbar-main .logo-image { height: 52px !important; min-width: 48px !important; }
          .navbar-search-form { flex-wrap: wrap !important; }
          .navbar-search-form .form-input { flex: 1 1 100% !important; width: 100% !important; }
          .navbar-search-form .btn { flex: 1; justify-content: center; }
          .navbar-mobile-drawer-header { padding: 1rem 1.15rem !important; }
          .navbar-mobile-drawer-body { padding: 1rem 1.15rem 1.5rem !important; }
        }
        @media (max-width: 380px) {
          .navbar-main { height: 60px !important; }
          .navbar-main .logo-image { height: 46px !important; }
          .navbar-mobile-drawer-body { padding: 0.85rem 1rem 1.25rem !important; }
        }
      `}</style>
    </header>
  );
}