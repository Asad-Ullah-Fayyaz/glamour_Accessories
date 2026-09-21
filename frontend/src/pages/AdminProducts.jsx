import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import AdminSidebar from '../components/admin/AdminSidebar';
import { Plus, Edit, Trash2, Star } from 'lucide-react';
import { fetchCategories, selectCategories } from '../store/slices/categoriesSlice';
import { deleteProduct, updateProduct } from '../store/slices/productsSlice';
import api from '../services/api';
import { productIsOnSale } from '../utils/productPricing';

export default function AdminProducts() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category') || 'All';

  const [products, setProducts] = useState([]);
  const categories = useSelector(selectCategories);
  const [counts, setCounts] = useState({ all: 0, byCategory: {} });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [notification, setNotification] = useState('');
  const navigate = useNavigate();

  // Load categories for the tabs
  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  // Load counts for each tab
  const fetchCounts = async () => {
    try {
      const res = await api.get('/admin/products/counts');
      if (res.success) {
        setCounts({
          all: res.all || 0,
          byCategory: res.byCategory || {}
        });
      }
    } catch (err) {
      // silent
    }
  };

  // Load products (respects category + search)
  const fetchProducts = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams();
      params.append('limit', '50');
      if (categoryParam && categoryParam !== 'All') {
        params.append('category', categoryParam);
      }
      if (search) {
        params.append('search', search);
      }

      const res = await api.get(`/admin/products?${params.toString()}`);
      if (res.success) {
        setProducts(res.products);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryParam]);

  // Debounced search: refetch when search changes (after 300ms)
  useEffect(() => {
    const t = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleCategoryClick = (slug) => {
    const newParams = new URLSearchParams(searchParams);
    if (slug === 'All') {
      newParams.delete('category');
    } else {
      newParams.set('category', slug);
    }
    setSearchParams(newParams);
    setSearch(''); // clear search when switching categories
  };

  const handleToggleFeatured = async (id, currentVal) => {
    setErrorMsg('');
    setNotification('');
    try {
      await dispatch(updateProduct({ id, payload: { isFeatured: !currentVal } })).unwrap();
      setNotification(`Product ${!currentVal ? 'marked as' : 'removed from'} Featured`);
      fetchProducts();
      fetchCounts();
      setTimeout(() => setNotification(''), 2500);
    } catch (err) {
      setErrorMsg(err.message || 'Action failed');
    }
  };

  const handleToggleActive = async (id, currentVal) => {
    setErrorMsg('');
    setNotification('');
    try {
      await dispatch(updateProduct({ id, payload: { isActive: !currentVal } })).unwrap();
      setNotification(`Product ${!currentVal ? 'enabled' : 'disabled'}`);
      fetchProducts();
      fetchCounts();
      setTimeout(() => setNotification(''), 2500);
    } catch (err) {
      setErrorMsg(err.message || 'Action failed');
    }
  };

  const handleDeleteProduct = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete product '${name}'?`)) {
      setErrorMsg('');
      try {
        await dispatch(deleteProduct(id)).unwrap();
        fetchProducts();
        fetchCounts();
      } catch (err) {
        setErrorMsg(err.message || 'Delete failed');
      }
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-secondary)' }}>
      <AdminSidebar />

      <main style={{ flex: 1, padding: '2.5rem' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-light)',
            paddingBottom: '1.5rem',
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div>
            <span
              style={{
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: 'var(--text-muted)'
              }}
            >
              ADMINISTRATION
            </span>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', marginTop: '2px' }}>
              Product Inventory Manager
            </h1>
          </div>

          <Link to="/admin/products/new" className="btn btn-primary">
            <Plus size={16} /> Add New Product
          </Link>
        </div>

        {/* Category Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '0.25rem',
            borderBottom: '1px solid var(--border-light)',
            marginBottom: '1.5rem',
            overflowX: 'auto',
            flexWrap: 'nowrap',
            scrollbarWidth: 'thin'
          }}
        >
          <TabButton
            label="All Products"
            count={counts.all}
            active={categoryParam === 'All'}
            onClick={() => handleCategoryClick('All')}
          />
          {categories.map((cat) => (
            <TabButton
              key={cat._id}
              label={cat.name}
              count={counts.byCategory[cat.slug] || 0}
              active={categoryParam === cat.slug}
              onClick={() => handleCategoryClick(cat.slug)}
            />
          ))}
        </div>

        {/* Banners */}
        {notification && (
          <div
            style={{
              backgroundColor: '#e6f4ea',
              border: '1px solid #b7e4c7',
              color: '#137333',
              padding: '0.85rem 1.25rem',
              borderRadius: '4px',
              marginBottom: '1.5rem',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}
          >
            {notification}
          </div>
        )}

        {errorMsg && (
          <div
            style={{
              backgroundColor: '#fff5f5',
              border: '1px solid #feb2b2',
              color: '#c53030',
              padding: '0.85rem 1.25rem',
              borderRadius: '4px',
              marginBottom: '1.5rem',
              fontSize: '0.85rem'
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Search filter */}
        <div style={{ marginBottom: '1.5rem', maxWidth: '400px' }}>
          <input
            type="text"
            placeholder={`Search products${
              categoryParam !== 'All' ? ' in this category' : ''
            }...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
          />
        </div>

        {/* Products Table */}
        <div
          style={{
            backgroundColor: '#fff',
            border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-subtle)'
          }}
        >
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '6rem' }}>
              <div className="spinner"></div>
            </div>
          ) : products.length === 0 ? (
            <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              {categoryParam !== 'All'
                ? `No products in "${categories.find((c) => c.slug === categoryParam)?.name || categoryParam}"${search ? ' matching your search' : ''}.`
                : search
                ? `No products matching "${search}".`
                : 'No products found in catalog.'}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Featured</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <img
                            src={
                              p.images?.[0] ||
                              'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1000&auto=format&fit=crop'
                            }
                            alt={p.name}
                            style={{ width: '48px', height: '60px', objectFit: 'cover' }}
                          />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {p.slug}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {p.category?.name || 'Uncategorized'}
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        {productIsOnSale(p) ? (
                          <div>
                            <span className="badge badge-gold" style={{ marginBottom: '0.35rem', display: 'inline-block' }}>
                              Sale
                            </span>
                            <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                              PKR {(p.previousPrice || 0).toLocaleString()}
                            </div>
                            <div>PKR {(p.price || 0).toLocaleString()}</div>
                          </div>
                        ) : (
                          <>PKR {(p.price || 0).toLocaleString()}</>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${p.stock > 5 ? 'badge-dark' : 'badge-warning'}`}>
                          {p.stock} units
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggleFeatured(p._id, p.isFeatured)}
                          style={{ color: p.isFeatured ? '#C5A059' : '#ccc' }}
                          title="Toggle Featured"
                        >
                          <Star size={18} fill={p.isFeatured ? '#C5A059' : 'none'} />
                        </button>
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggleActive(p._id, p.isActive)}
                          className={`badge ${p.isActive ? 'badge-success' : 'badge-danger'}`}
                        >
                          {p.isActive ? 'Active' : 'Disabled'}
                        </button>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div
                          style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}
                        >
                          <button
                            onClick={() => navigate(`/admin/products/edit/${p._id}`)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.3rem 0.5rem' }}
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p._id, p.name)}
                            className="btn btn-secondary btn-sm"
                            style={{
                              padding: '0.3rem 0.5rem',
                              color: 'red',
                              borderColor: '#ffcccc'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/* --- Underline Tab Component --- */

function TabButton({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.85rem 1.25rem',
        fontSize: '0.85rem',
        fontWeight: active ? 700 : 500,
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        backgroundColor: 'transparent',
        border: 'none',
        borderBottom: active
          ? '2px solid var(--text-primary)'
          : '2px solid transparent',
        marginBottom: '-1px',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'color 0.15s, border-color 0.15s',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem'
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.color = 'var(--text-primary)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.color = 'var(--text-secondary)';
      }}
    >
      {label}
      {typeof count === 'number' && (
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            color: active ? 'var(--text-primary)' : 'var(--text-muted)',
            backgroundColor: active ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
            padding: '0.15rem 0.45rem',
            borderRadius: '999px',
            lineHeight: 1
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}