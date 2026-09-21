import React, { useState, useEffect } from 'react';
import AdminSidebar from '../components/admin/AdminSidebar';
import { Plus, Trash2, Package } from 'lucide-react';
import api from '../services/api';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [notification, setNotification] = useState('');
  const [busyId, setBusyId] = useState(null); // tracks which category is being toggled/deleted

  // New Category Form
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // New SubCategory Form
  const [selectedParentId, setSelectedParentId] = useState('');
  const [newSubName, setNewSubName] = useState('');

  // ---- Load categories from the admin endpoint ----
  const fetchCategories = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.get('/admin/categories');
      if (res.success) {
        setCategories(res.categories);
        if (res.categories.length > 0 && !selectedParentId) {
          setSelectedParentId(res.categories[0]._id);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Create Category ----
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setErrorMsg('');
    try {
      await api.post('/categories', {
        name: newCatName.trim(),
        description: newCatDesc.trim()
      });
      setNewCatName('');
      setNewCatDesc('');
      setNotification('Category created');
      setTimeout(() => setNotification(''), 2500);
      fetchCategories();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create category');
    }
  };

  // ---- Create SubCategory ----
  const handleCreateSubCategory = async (e) => {
    e.preventDefault();
    if (!newSubName.trim() || !selectedParentId) return;
    setErrorMsg('');
    try {
      await api.post('/categories/subcategory', {
        name: newSubName.trim(),
        categoryId: selectedParentId
      });
      setNewSubName('');
      setNotification('Subcategory created');
      setTimeout(() => setNotification(''), 2500);
      fetchCategories();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create subcategory');
    }
  };

  // ---- Toggle Category Active ----
  const handleToggleCategory = async (id, name, currentActive) => {
    setErrorMsg('');
    setNotification('');
    setBusyId(id);
    try {
      const res = await api.put(`/admin/categories/${id}/toggle`);
      if (res.success) {
        setNotification(
          `"${name}" ${currentActive ? 'disabled' : 'enabled'}`
        );
        setTimeout(() => setNotification(''), 2500);
        await fetchCategories();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Toggle failed');
    } finally {
      setBusyId(null);
    }
  };

  // ---- Delete Category ----
  const handleDeleteCategory = async (id, name, productCount) => {
    if (productCount > 0) {
      setErrorMsg(
        `Cannot delete "${name}": ${productCount} product${productCount === 1 ? ' is' : 's are'} assigned to it. Move or delete those products first.`
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (
      !window.confirm(
        `Delete category "${name}" and all its subcategories?\n\nThis cannot be undone.`
      )
    ) {
      return;
    }

    setErrorMsg('');
    setNotification('');
    setBusyId(id);
    try {
      const res = await api.delete(`/admin/categories/${id}`);
      if (res.success) {
        setNotification(res.message || `"${name}" deleted`);
        setTimeout(() => setNotification(''), 3000);
        await fetchCategories();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Delete failed');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-secondary)' }}>
      <AdminSidebar />

      <main style={{ flex: 1, padding: '2.5rem' }}>
        {/* Header */}
        <div
          style={{
            borderBottom: '1px solid var(--border-light)',
            paddingBottom: '1.5rem',
            marginBottom: '2.5rem'
          }}
        >
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
            Category Hierarchy (2-Level)
          </h1>
        </div>

        {/* Banners */}
        {notification && (
          <div
            style={{
              backgroundColor: '#e6f4ea',
              border: '1px solid #b7e4c7',
              color: '#137333',
              padding: '0.85rem 1.25rem',
              borderRadius: 'var(--radius-sm)',
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
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.5rem',
              fontSize: '0.85rem'
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Two-column forms */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }}>
          {/* Create Top Category */}
          <div
            style={{
              backgroundColor: '#fff',
              padding: '1.75rem',
              border: '1px solid var(--border-light)',
              boxShadow: 'var(--shadow-subtle)'
            }}
          >
            <h3
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.25rem',
                marginBottom: '1.25rem'
              }}
            >
              Add Top Category
            </h3>
            <form onSubmit={handleCreateCategory}>
              <div className="form-group">
                <label className="form-label">Category Name *</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  required
                  className="form-input"
                  placeholder="e.g. Smart Accessories"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  type="text"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="form-input"
                  placeholder="Brief description"
                />
              </div>
              <button type="submit" className="btn btn-primary btn-sm btn-full">
                <Plus size={14} /> Create Category
              </button>
            </form>
          </div>

          {/* Create Subcategory */}
          <div
            style={{
              backgroundColor: '#fff',
              padding: '1.75rem',
              border: '1px solid var(--border-light)',
              boxShadow: 'var(--shadow-subtle)'
            }}
          >
            <h3
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.25rem',
                marginBottom: '1.25rem'
              }}
            >
              Add 2nd Level Sub-Category
            </h3>
            <form onSubmit={handleCreateSubCategory}>
              <div className="form-group">
                <label className="form-label">Select Parent Category *</label>
                <select
                  value={selectedParentId}
                  onChange={(e) => setSelectedParentId(e.target.value)}
                  className="form-select"
                >
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Sub-Category Name *</label>
                <input
                  type="text"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  required
                  className="form-input"
                  placeholder="e.g. Leather Straps"
                />
              </div>
              <button type="submit" className="btn btn-primary btn-sm btn-full">
                <Plus size={14} /> Create Sub-Category
              </button>
            </form>
          </div>
        </div>

        {/* Existing Categories Table */}
        <div
          style={{
            backgroundColor: '#fff',
            padding: '1.75rem',
            border: '1px solid var(--border-light)',
            marginTop: '2.5rem',
            boxShadow: 'var(--shadow-subtle)'
          }}
        >
          <h3
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.3rem',
              marginBottom: '1.5rem'
            }}
          >
            Current Store Categories
          </h3>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
              <div className="spinner"></div>
            </div>
          ) : categories.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No categories yet. Create one above.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Slug</th>
                    <th>Sub-Categories</th>
                    <th>Products</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => {
                    const isBusy = busyId === cat._id;
                    const productCount = cat.productCount || 0;
                    const hasProducts = productCount > 0;

                    return (
                      <tr key={cat._id} style={{ opacity: isBusy ? 0.5 : 1 }}>
                        <td style={{ fontWeight: 700 }}>{cat.name}</td>
                        <td
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.8rem',
                            color: 'var(--text-muted)'
                          }}
                        >
                          {cat.slug}
                        </td>
                        <td>
                          {cat.subCategories && cat.subCategories.length > 0 ? (
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                              {cat.subCategories.map((sub) => (
                                <span key={sub._id} className="badge badge-dark">
                                  {sub.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              None
                            </span>
                          )}
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              color: hasProducts
                                ? 'var(--text-primary)'
                                : 'var(--text-muted)'
                            }}
                          >
                            <Package size={14} />
                            {productCount}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              handleToggleCategory(cat._id, cat.name, cat.isActive)
                            }
                            className={`badge ${
                              cat.isActive ? 'badge-success' : 'badge-danger'
                            }`}
                            style={{
                              cursor: isBusy ? 'wait' : 'pointer',
                              border: 'none',
                              fontFamily: 'inherit'
                            }}
                            title={cat.isActive ? 'Click to disable' : 'Click to enable'}
                          >
                            {cat.isActive ? 'Active' : 'Disabled'}
                          </button>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              handleDeleteCategory(cat._id, cat.name, productCount)
                            }
                            className="btn btn-secondary btn-sm"
                            style={{
                              padding: '0.3rem 0.5rem',
                              color: hasProducts ? '#aaa' : 'red',
                              borderColor: hasProducts ? '#eee' : '#ffcccc',
                              cursor: isBusy
                                ? 'wait'
                                : hasProducts
                                ? 'not-allowed'
                                : 'pointer'
                            }}
                            title={
                              hasProducts
                                ? `Cannot delete — ${productCount} product${
                                    productCount === 1 ? '' : 's'
                                  } assigned`
                                : 'Delete category'
                            }
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}