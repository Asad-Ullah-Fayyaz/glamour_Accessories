import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import api from '../services/api';

export default function AdminProductEdit() {
  const { id } = useParams();
  const isEditMode = !!id;
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
const [formData, setFormData] = useState({
  name: '',
  description: '',
  price: '',
  isOnSale: false,
  salePrice: '',
  newIs: false,
  stock: '',
  category: '',
  subCategory: '',
  images: [],
  isFeatured: false,
  isActive: true,
  isCustomizable: false
});

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await api.get('/categories');
        if (res.success) setCategories(res.categories);
      } catch (err) {
        setErrorMsg(err.message || 'Failed to load categories');
      }
    };
    loadCategories();

    if (isEditMode) {
      const loadProduct = async () => {
        setLoading(true);
        setErrorMsg('');
        try {
          const res = await api.get(`/products/id/${id}`);
          if (res.success && res.product) {
            const p = res.product;
           setFormData({
  name: p.name || '',
  description: p.description || '',
  price: p.price ?? '',
  isOnSale: !!p.isOnSale,
  salePrice: p.salePrice ?? '',
  newIs: !!p.newIs,
  stock: p.stock ?? '',
  category: p.category?._id || p.category || '',
  subCategory: p.subCategory?._id || p.subCategory || '',
  images: Array.isArray(p.images) && p.images.length > 0 ? p.images : [],
  isFeatured: !!p.isFeatured,
  isActive: p.isActive !== false,
  isCustomizable: !!p.isCustomizable
});
          } else {
            setErrorMsg('Product not found');
          }
        } catch (err) {
          setErrorMsg(err.message || 'Failed to load product');
        } finally {
          setLoading(false);
        }
      };
      loadProduct();
    }
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddImageUrl = () => {
    if (imageUrlInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, imageUrlInput.trim()]
      }));
      setImageUrlInput('');
    }
  };

  const handleRemoveImage = (idx) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idx)
    }));
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const data = new FormData();
    for (let i = 0; i < files.length; i++) {
      data.append('images', files[i]);
    }

    setUploading(true);
    setErrorMsg('');
    try {
      const res = await api.post('/products/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.success && Array.isArray(res.images)) {
        setFormData((prev) => ({
          ...prev,
          images: [...prev.images, ...res.images]
        }));
      }
    } catch (err) {
      setErrorMsg(err.message || 'Image upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // ---- Client-side validation ----
    const priceNum = Number(formData.price);
    const stockNum = Number(formData.stock);
    const salePriceNum = Number(formData.salePrice);

    if (!formData.name.trim()) {
      setErrorMsg('Product name is required.');
      return;
    }
    if (!formData.category) {
      setErrorMsg('Please select a category.');
      return;
    }
    if (formData.isOnSale) {
      if (formData.salePrice === '' || !Number.isFinite(salePriceNum) || salePriceNum <= 0) {
        setErrorMsg('Sale price must be a positive number when the product is on sale.');
        return;
      }
      if (salePriceNum >= priceNum) {
        setErrorMsg('Sale price must be strictly less than the regular price.');
        return;
      }
    }
    if (formData.price === '' || isNaN(priceNum) || priceNum <= 0) {
      setErrorMsg('Price must be a positive number.');
      return;
    }
    if (formData.stock === '' || isNaN(stockNum) || stockNum < 0) {
      setErrorMsg('Stock must be zero or a positive number.');
      return;
    }
    if (!formData.description.trim()) {
      setErrorMsg('Product description is required.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
  name: formData.name.trim(),
  description: formData.description.trim(),
  price: priceNum,
  stock: stockNum,
  category: formData.category,
  subCategory: formData.subCategory || null,
  images: formData.images,
  isFeatured: formData.isFeatured,
  isActive: formData.isActive,
  isCustomizable: formData.isCustomizable,
  isOnSale: formData.isOnSale,
  newIs: formData.newIs,
  ...(formData.isOnSale ? { salePrice: salePriceNum } : {})
};

      let res;
      if (isEditMode) {
        res = await api.put(`/products/${id}`, payload);
      } else {
        res = await api.post('/products', payload);
      }

      if (res && res.success) {
        navigate('/admin/products');
      } else {
        setErrorMsg('Save failed — no confirmation from server');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const selectedCatObj = categories.find((c) => c._id === formData.category);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-secondary)' }}>
      <AdminSidebar />

      <main style={{ flex: 1, padding: '2.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <Link
            to="/admin/products"
            style={{
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              marginBottom: '0.5rem'
            }}
          >
            <ArrowLeft size={14} /> Back to Products List
          </Link>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem' }}>
            {isEditMode ? 'Edit Catalog Product' : 'Create New Product'}
          </h1>
        </div>

        {errorMsg && (
          <div
            style={{
              backgroundColor: '#fce8e6',
              color: '#c5221f',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.5rem',
              fontSize: '0.85rem'
            }}
          >
            {errorMsg}
          </div>
        )}

        {isEditMode && loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '6rem' }}>
            <div className="spinner" />
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{
              backgroundColor: '#fff',
              padding: '2rem',
              border: '1px solid var(--border-light)',
              boxShadow: 'var(--shadow-subtle)',
              maxWidth: '900px'
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="form-input"
                  placeholder="e.g. AXI Royal Chronograph Obsidian"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Parent Category *</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  className="form-select"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Sub-Category (Optional)</label>
                <select
                  name="subCategory"
                  value={formData.subCategory}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="">None</option>
                  {selectedCatObj?.subCategories?.map((sub) => (
                    <option key={sub._id} value={sub._id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Price (PKR) *</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  min="0.01"
                  step="0.01"
                  className="form-input"
                  placeholder="e.g. 24900"
                />
                {formData.isOnSale && (
                  <div className="form-group">
                    <label className="form-label">Sale Price (PKR) *</label>
                    <input
                      type="number"
                      name="salePrice"
                      value={formData.salePrice}
                      onChange={handleChange}
                      required
                      min="0.01"
                      step="0.01"
                      className="form-input"
                      placeholder="e.g. 7999"
                    />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Stock Quantity *</label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  required
                  min="0"
                  step="1"
                  className="form-input"
                  placeholder="e.g. 15"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Product Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={4}
                className="form-textarea"
                placeholder="Describe materials, movement specs, craftsmanship details..."
              />
            </div>

            {/* Product Image Management */}
            <div
              className="form-group"
              style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}
            >
              <label className="form-label">Product Images (Hover & Gallery)</label>

              <div
                style={{
                  display: 'flex',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  marginBottom: '1rem'
                }}
              >
                {formData.images.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      width: '90px',
                      height: '110px',
                      border: '1px solid var(--border-light)'
                    }}
                  >
                    <img
                      src={imgUrl}
                      alt={`Product ${idx + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        color: '#fff',
                        padding: '2px',
                        borderRadius: '50%'
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                    {idx === 0 && (
                      <span
                        className="badge badge-dark"
                        style={{ position: 'absolute', bottom: '2px', left: '2px', fontSize: '0.6rem' }}
                      >
                        Primary
                      </span>
                    )}
                    {idx === 1 && (
                      <span
                        className="badge badge-gold"
                        style={{ position: 'absolute', bottom: '2px', left: '2px', fontSize: '0.6rem' }}
                      >
                        Hover 2nd
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'center',
                  marginBottom: '1rem'
                }}
              >
                <input
                  type="text"
                  placeholder="Enter image URL..."
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  className="form-input"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="btn btn-secondary btn-sm"
                >
                  <Plus size={14} /> Add URL
                </button>
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Or upload local image files:
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'block', marginTop: '0.4rem' }}
                />
                {uploading && <span>Uploading file...</span>}
              </div>
            </div>

          <div
  style={{
    display: 'flex',
    gap: '2rem',
    margin: '1.5rem 0',
    flexWrap: 'wrap'
  }}
>
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
      name="isFeatured"
      checked={formData.isFeatured}
      onChange={handleChange}
    />
    Featured Product (Showcase on Homepage)
  </label>

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
      name="isActive"
      checked={formData.isActive}
      onChange={handleChange}
    />
    Active in Catalog
  </label>

  <label
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontSize: '0.85rem',
      cursor: 'pointer'
    }}
    title="Customers can upload a prescription or write one when buying this product"
  >
    <input
      type="checkbox"
      name="isCustomizable"
      checked={formData.isCustomizable}
      onChange={handleChange}
    />
    Customizable (Prescription Glasses)
  </label>

  <label
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontSize: '0.85rem',
      cursor: 'pointer'
    }}
    title="Sell this product at the sale price"
  >
    <input
      type="checkbox"
      name="isOnSale"
      checked={formData.isOnSale}
      onChange={handleChange}
    />
    On Sale
  </label>

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
      name="newIs"
      checked={formData.newIs}
      onChange={handleChange}
    />
    Mark as New
  </label>
</div>

            <div
              style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'flex-end',
                borderTop: '1px solid var(--border-light)',
                paddingTop: '1.5rem'
              }}
            >
              <Link to="/admin/products" className="btn btn-secondary">
                Cancel
              </Link>
              <button type="submit" disabled={loading} className="btn btn-primary">
                <Save size={16} />{' '}
                {loading ? 'Saving...' : isEditMode ? 'Update Product' : 'Create Product'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}