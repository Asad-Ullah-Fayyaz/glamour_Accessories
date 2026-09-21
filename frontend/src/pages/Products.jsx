import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Filter, ChevronRight, X, ChevronLeft } from 'lucide-react';
import ProductCard from '../components/product/ProductCard';
import { fetchCategories, selectCategories } from '../store/slices/categoriesSlice';
import {
  fetchProducts,
  selectProductsList,
  selectProductsTotal,
  selectProductsPages,
  selectProductsLoading
} from '../store/slices/productsSlice';
import api from '../services/api';

export default function Products() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const products = useSelector(selectProductsList);
  const totalProducts = useSelector(selectProductsTotal);
  const totalPages = useSelector(selectProductsPages);
  const loading = useSelector(selectProductsLoading);
  const categories = useSelector(selectCategories);

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const categoryParam = searchParams.get('category') || '';
  const subCategoryParam = searchParams.get('subCategory') || '';
  const searchParam = searchParams.get('search') || '';
  const sortParam = searchParams.get('sort') || 'newest';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const inStockParam = searchParams.get('inStock') === 'true';

  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');

  useEffect(() => {
    setMinPrice(searchParams.get('minPrice') || '');
    setMaxPrice(searchParams.get('maxPrice') || '');
  }, [searchParams]);

  useEffect(() => {
    if (isFilterOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFilterOpen]);

  useEffect(() => {
    if (!categories || categories.length === 0) {
      dispatch(fetchCategories());
    }
  }, [dispatch, categories]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (categoryParam) params.append('category', categoryParam);
    if (subCategoryParam) params.append('subCategory', subCategoryParam);
    if (searchParam) params.append('search', searchParam);
    if (sortParam) params.append('sort', sortParam);
    if (inStockParam) params.append('inStock', 'true');
    if (minPrice !== '' && minPrice != null) params.append('minPrice', minPrice);
    if (maxPrice !== '' && maxPrice != null) params.append('maxPrice', maxPrice);
    params.append('page', pageParam.toString());
    params.append('limit', '12');

    dispatch(fetchProducts(params.toString()));
  }, [dispatch, categoryParam, subCategoryParam, searchParam, sortParam, pageParam, inStockParam, minPrice, maxPrice]);

  const updateParam = (key, value) => {
    updateParams({ [key]: value });
  };

  const updateParams = (updates) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) newParams.set(key, value);
      else newParams.delete(key);
    });
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  // Pagination-only helper — does NOT reset page
  const goToPage = (page) => {
    if (page === pageParam) return;
    if (page < 1 || page > totalPages) return;
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', String(page));
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePriceApply = (e) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (minPrice !== '' && minPrice != null) newParams.set('minPrice', minPrice);
    else newParams.delete('minPrice');
    if (maxPrice !== '' && maxPrice != null) newParams.set('maxPrice', maxPrice);
    else newParams.delete('maxPrice');
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const clearAllFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    setSearchParams(new URLSearchParams());
  };

  // Build a windowed page list: [1, '…', 4, 5, 6, '…', 30]
  const buildPageWindow = (current, total, siblings = 1) => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const left = Math.max(2, current - siblings);
    const right = Math.min(total - 1, current + siblings);
    const pages = [1];

    if (left > 2) pages.push('start-ellipsis');

    for (let i = left; i <= right; i += 1) pages.push(i);

    if (right < total - 1) pages.push('end-ellipsis');

    pages.push(total);
    return pages;
  };

  const activeCategoryObj = categories.find((c) => c.slug === categoryParam);
  const hasActiveFilters =
    categoryParam || subCategoryParam || searchParam || minPrice || maxPrice || inStockParam;

  return (
    <div className="container products-page" style={{ padding: '3rem 1.5rem' }}>
      {/* Breadcrumb & Header */}
      <div className="products-header" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div
          className="products-breadcrumbs"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            marginBottom: '0.5rem'
          }}
        >
          <Link
            to="/"
            style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            Home
          </Link>

          <ChevronRight size={12} />

          <Link
            to="/products"
            style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            Catalog
          </Link>

          {activeCategoryObj && (
            <>
              <ChevronRight size={12} />
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {activeCategoryObj.name}
              </span>
            </>
          )}
        </div>

        <h1
          className="products-title"
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '2.5rem',
            textTransform: 'capitalize'
          }}
        >
          {searchParam
            ? `Search Results for "${searchParam}"`
            : activeCategoryObj
            ? activeCategoryObj.name
            : 'All Products'}
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
          Showing {totalProducts} luxury timepieces, frames, and accessories
        </p>
      </div>

      <div
        className="products-layout"
        style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '3rem' }}
      >
        {/* LEFT — Filter Drawer / Static Sidebar */}
        <div
          className={`filter-drawer ${isFilterOpen ? 'open' : ''}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsFilterOpen(false);
          }}
        >
          <aside
            className="filter-panel"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-sm)',
              padding: '1.5rem',
              alignSelf: 'start',
              position: 'relative'
            }}
          >
            <button
              className="mobile-filter-close"
              onClick={() => setIsFilterOpen(false)}
              style={{
                display: 'none',
                position: 'absolute',
                top: '0.75rem',
                right: '0.75rem',
                padding: '0.4rem',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
              aria-label="Close filters"
            >
              <X size={20} />
            </button>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--border-light)',
                paddingBottom: '0.75rem',
                marginBottom: '1.5rem'
              }}
            >
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Filter size={16} /> Filters
              </span>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    textDecoration: 'underline'
                  }}
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Category Tree */}
            <div style={{ marginBottom: '2rem' }}>
              <h4
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--text-secondary)',
                  marginBottom: '1rem'
                }}
              >
                Categories
              </h4>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                  fontSize: '0.875rem'
                }}
              >
                <button
                  onClick={() => updateParams({ category: '', subCategory: '' })}
                  style={{
                    textAlign: 'left',
                    fontWeight: !categoryParam ? 700 : 400,
                    color: !categoryParam ? '#000' : 'var(--text-secondary)'
                  }}
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <div key={cat._id}>
                    <button
                      onClick={() => updateParams({ category: cat.slug, subCategory: '' })}
                      style={{
                        textAlign: 'left',
                        width: '100%',
                        fontWeight: categoryParam === cat.slug ? 700 : 400,
                        color: categoryParam === cat.slug ? '#000' : 'var(--text-secondary)'
                      }}
                    >
                      {cat.name}
                    </button>

                    {categoryParam === cat.slug &&
                      cat.subCategories &&
                      cat.subCategories.length > 0 && (
                        <div
                          style={{
                            paddingLeft: '1rem',
                            marginTop: '0.4rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.4rem'
                          }}
                        >
                          {cat.subCategories.map((sub) => (
                            <button
                              key={sub._id}
                              onClick={() => updateParam('subCategory', sub.slug)}
                              style={{
                                textAlign: 'left',
                                fontSize: '0.8rem',
                                fontWeight: subCategoryParam === sub.slug ? 700 : 400,
                                color:
                                  subCategoryParam === sub.slug
                                    ? '#000'
                                    : 'var(--text-muted)'
                              }}
                            >
                              &bull; {sub.name}
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                ))}
              </div>
            </div>

            {/* Availability */}
            <div
              style={{
                marginBottom: '2rem',
                borderTop: '1px solid var(--border-light)',
                paddingTop: '1.5rem'
              }}
            >
              <h4
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--text-secondary)',
                  marginBottom: '0.75rem'
                }}
              >
                Availability
              </h4>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="checkbox"
                  checked={inStockParam}
                  onChange={(e) => updateParam('inStock', e.target.checked ? 'true' : '')}
                />
                In Stock Only
              </label>
            </div>

            {/* Price */}
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
              <h4
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--text-secondary)',
                  marginBottom: '0.75rem'
                }}
              >
                Price Range (PKR)
              </h4>
              <form
                onSubmit={handlePriceApply}
                style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}
              >
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="form-input"
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="form-input"
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%' }}
                >
                  Apply Price
                </button>
              </form>
            </div>

            <button
              className="mobile-filter-apply"
              onClick={() => setIsFilterOpen(false)}
              style={{
                display: 'none',
                width: '100%',
                marginTop: '1.5rem',
                padding: '0.85rem 1.5rem',
                backgroundColor: 'var(--bg-dark)',
                color: '#FFFFFF',
                fontSize: '0.8rem',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer'
              }}
            >
              Show Results
            </button>
          </aside>
        </div>

        {/* RIGHT — Main Catalog */}
        <main style={{ minWidth: 0 }}>
          <button
            className="mobile-filter-btn"
            onClick={() => setIsFilterOpen(true)}
            style={{
              display: 'none',
              alignItems: 'center',
              gap: '0.5rem',
              width: '100%',
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              border: '1px solid var(--border-light)',
              backgroundColor: 'var(--bg-secondary)',
              fontSize: '0.8rem',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              color: 'var(--text-primary)'
            }}
          >
            <Filter size={16} /> Filters
            {hasActiveFilters && (
              <span className="badge badge-dark" style={{ marginLeft: 'auto' }}>
                Active
              </span>
            )}
          </button>

          <div
            className="products-sort-bar"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: '1rem',
              borderBottom: '1px solid var(--border-light)',
              marginBottom: '2rem',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}
          >
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Showing {products.length} of {totalProducts} items
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Sort By:
              </label>
              <select
                value={sortParam}
                onChange={(e) => updateParam('sort', e.target.value)}
                className="form-select"
                style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              >
                <option value="newest">Newest Arrivals</option>
                <option value="featured">Featured First</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="products-loading" style={{ display: 'flex', justifyContent: 'center', padding: '6rem' }}>
              <div className="spinner"></div>
            </div>
          ) : products.length === 0 ? (
            <div
              className="products-empty"
              style={{
                textAlign: 'center',
                padding: '5rem 1rem',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <h3
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.5rem',
                  marginBottom: '0.5rem'
                }}
              >
                No Products Found
              </h3>
              <p
                style={{
                  fontSize: '0.9rem',
                  color: 'var(--text-muted)',
                  marginBottom: '1.5rem'
                }}
              >
                We couldn't find any products matching your current filters.
              </p>
              <button onClick={clearAllFilters} className="btn btn-primary btn-sm">
                Clear All Filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid-products">
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>

              {totalPages > 1 && (
                <div
                  className="products-pagination"
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '0.4rem',
                    marginTop: '4rem',
                    flexWrap: 'wrap'
                  }}
                >
                  {/* Previous button */}
                  <button
                    onClick={() => goToPage(pageParam - 1)}
                    disabled={pageParam <= 1}
                    className="btn btn-sm btn-secondary"
                    style={{
                      minWidth: '38px',
                      opacity: pageParam <= 1 ? 0.4 : 1,
                      cursor: pageParam <= 1 ? 'not-allowed' : 'pointer'
                    }}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  {/* Numbered page buttons with ellipses */}
                  {buildPageWindow(pageParam, totalPages).map((p, idx) => {
                    if (typeof p === 'string') {
                      return (
                        <span
                          key={`${p}-${idx}`}
                          style={{
                            padding: '0 0.5rem',
                            fontSize: '0.85rem',
                            color: 'var(--text-muted)',
                            userSelect: 'none'
                          }}
                        >
                          …
                        </span>
                      );
                    }
                    const isActive = p === pageParam;
                    return (
                      <button
                        key={p}
                        onClick={() => goToPage(p)}
                        className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ minWidth: '38px' }}
                        aria-label={`Go to page ${p}`}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        {p}
                      </button>
                    );
                  })}

                  {/* Next button */}
                  <button
                    onClick={() => goToPage(pageParam + 1)}
                    disabled={pageParam >= totalPages}
                    className="btn btn-sm btn-secondary"
                    style={{
                      minWidth: '38px',
                      opacity: pageParam >= totalPages ? 0.4 : 1,
                      cursor: pageParam >= totalPages ? 'not-allowed' : 'pointer'
                    }}
                    aria-label="Next page"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <style>{`
        .filter-drawer {
          display: contents;
        }

        .mobile-filter-btn,
        .mobile-filter-close,
        .mobile-filter-apply {
          display: none;
        }

        /* === Responsive fixes only === */
        .products-layout > main {
          min-width: 0;
        }

        @media (max-width: 900px) {
          .products-layout {
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 0 !important;
          }

          .mobile-filter-btn {
            display: flex !important;
          }
          .mobile-filter-close {
            display: block !important;
          }
          .mobile-filter-apply {
            display: block !important;
          }

          .filter-drawer {
            display: none;
            position: fixed;
            inset: 0;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 2000;
            padding: 0;
          }

          .filter-drawer.open {
            display: block;
          }

          .filter-drawer .filter-panel {
            position: absolute;
            top: 0;
            left: 0;
            bottom: 0;
            width: 85%;
            max-width: 340px;
            overflow-y: auto;
            border-radius: 0 !important;
            border: none !important;
            padding: 3rem 1.5rem 1.5rem !important;
            animation: slideIn 0.3s cubic-bezier(0.22, 1, 0.36, 1);
          }

          @keyframes slideIn {
            from { transform: translateX(-100%); }
            to { transform: translateX(0); }
          }
        }

        @media (max-width: 640px) {
          .products-page {
            padding: 2rem 1rem !important;
          }
          .products-header {
            margin-bottom: 1.75rem !important;
          }
          .products-breadcrumbs {
            flex-wrap: wrap !important;
            row-gap: 0.25rem !important;
          }
          .products-breadcrumbs > span {
            overflow-wrap: anywhere;
          }
          .products-title {
            font-size: 1.6rem !important;
          }
          .products-loading {
            padding: 3.5rem 1rem !important;
          }
          .products-empty {
            padding: 3rem 1rem !important;
          }
          .products-pagination {
            marginTop: 2.5rem !important;
            gap: 0.3rem !important;
          }
          .products-sort-bar {
            align-items: flex-start !important;
          }
          .products-sort-bar > div {
            width: 100%;
            justify-content: space-between;
          }
          .products-sort-bar select {
            flex: 1;
            min-width: 0;
          }
          .filter-drawer .filter-panel {
            padding: 3rem 1.15rem 1.25rem !important;
          }
        }

        @media (max-width: 380px) {
          .products-title {
            font-size: 1.35rem !important;
          }
          .filter-drawer .filter-panel {
            padding: 2.75rem 1rem 1rem !important;
          }
        }
      `}</style>
    </div>
  );
}