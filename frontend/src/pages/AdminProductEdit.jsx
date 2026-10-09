import React, { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Plus, Save, Trash2, Video, Image as ImageIcon, Loader2, ChevronUp, ChevronDown, Star } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar';
import api, { toAbsoluteUrl } from '../services/api';

const emptyForm = {
  name: '',
  description: '',
  price: '',
  stock: '',
  category: '',
  subCategory: '',
  subSubCategory: '',
  images: [],
  isFeatured: false,
  isActive: true,
  isCustomizable: false,
  isOnSale: false,
  salePrice: '',
  newIs: false,
  trustMedia: []
};

export default function AdminProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(isEditMode);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');

  // Trust media upload state (per-slot)
  const trustFileRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const categoryResponse = await api.get('/categories');
        if (categoryResponse.success) setCategories(categoryResponse.categories || []);
        if (!isEditMode) return;
        const productResponse = await api.get(`/products/id/${id}`);
        if (!productResponse.success || !productResponse.product) {
          throw new Error('Product not found');
        }
        const product = productResponse.product;
        const path = product.categoryPath || {};
        setFormData({
          ...emptyForm,
          name: product.name || '',
          description: product.description || '',
          price: product.price ?? '',
          stock: product.stock ?? '',
          category: path.l1?._id || '',
          subCategory: path.l2?._id || '',
          subSubCategory: path.l3?._id || '',
          images: Array.isArray(product.images) ? product.images : [],
          isFeatured: Boolean(product.isFeatured),
          isActive: product.isActive !== false,
          isCustomizable: Boolean(product.isCustomizable),
          isOnSale: Boolean(product.isOnSale),
          salePrice: product.salePrice ?? '',
          newIs: Boolean(product.newIs),
          trustMedia: Array.isArray(product.trustMedia) ? product.trustMedia : []
        });
      } catch (err) {
        setErrorMsg(err.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isEditMode]);

  const selectedL1 = categories.find((category) => category._id === formData.category);
  const l2Options = selectedL1?.children || [];
  const selectedL2 = l2Options.find((category) => category._id === formData.subCategory);
  const l3Options = selectedL2?.children || [];

  const handleChange = (event) => {
    const { name, type, value, checked } = event.target;
    setFormData((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleCategoryChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
      ...(name === 'category' ? { subCategory: '', subSubCategory: '' } : {}),
      ...(name === 'subCategory' ? { subSubCategory: '' } : {})
    }));
  };

  const addImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    setFormData((current) => ({ ...current, images: [...current.images, imageUrlInput.trim()] }));
    setImageUrlInput('');
  };

  const uploadImages = async (event) => {
    if (!event.target.files?.length) return;
    const data = new FormData();
    Array.from(event.target.files).forEach((file) => data.append('images', file));
    setUploading(true);
    try {
      const response = await api.post('/products/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.success) {
        setFormData((current) => ({
          ...current,
          images: [...current.images, ...(response.images || [])]
        }));
      }
    } catch (err) {
      setErrorMsg(err.message || 'Image upload failed');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  // ─────────────────────────────────────────────────────────────
  // TRUST MEDIA HELPERS
  // ─────────────────────────────────────────────────────────────

  // Add a new empty slot to the trust carousel — admin fills the URL
  // manually if they want to paste a link instead of uploading.
  const addTrustMediaFromUrl = (url, type) => {
    if (!url || !url.trim()) return;
    setFormData((current) => ({
      ...current,
      trustMedia: [
        ...current.trustMedia,
        {
          url: url.trim(),
          type: type || 'image',
          caption: '',
          customerName: '',
          city: '',
          rating: undefined,
          addedAt: new Date().toISOString()
        }
      ]
    }));
  };

  // Upload a trust-media file (image or video) to the existing
  // /site-content/homepage/upload endpoint (Cloudinary-backed).
  const handleTrustFileUpload = async (event) => {
    const files = event.target.files;
    if (!files?.length) return;

    setUploading(true);
    setErrorMsg('');
    try {
      const newItems = [];

      // Upload one file at a time so we know each file's type
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('image', file); // backend field name is always 'image'
        // eslint-disable-next-line no-await-in-loop
        const res = await api.post('/site-content/homepage/upload', formData);
        if (res.success && res.url) {
          newItems.push({
            url: res.url,
            type: file.type.startsWith('video/') ? 'video' : 'image',
            caption: '',
            customerName: '',
            city: '',
            rating: undefined,
            addedAt: new Date().toISOString()
          });
        }
      }

      if (newItems.length > 0) {
        setFormData((current) => ({
          ...current,
          trustMedia: [...current.trustMedia, ...newItems]
        }));
      }
    } catch (err) {
      setErrorMsg(err.message || 'Trust media upload failed');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const updateTrustMedia = (index, patch) => {
    setFormData((current) => {
      const next = [...current.trustMedia];
      next[index] = { ...next[index], ...patch };
      return { ...current, trustMedia: next };
    });
  };

  const removeTrustMedia = (index) => {
    setFormData((current) => ({
      ...current,
      trustMedia: current.trustMedia.filter((_, i) => i !== index)
    }));
  };

  const moveTrustMedia = (index, dir) => {
    setFormData((current) => {
      const next = [...current.trustMedia];
      const target = index + dir;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...current, trustMedia: next };
    });
  };

  // ─────────────────────────────────────────────────────────────
  // SUBMIT
  // ─────────────────────────────────────────────────────────────

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMsg('');

    const price = Number(formData.price);
    const stock = Number(formData.stock);
    const salePrice = Number(formData.salePrice);

    if (!formData.name.trim()) return setErrorMsg('Product name is required.');
    if (!formData.category) return setErrorMsg('Please select a Level 1 category.');
    if (!formData.subCategory) return setErrorMsg('Please select a Level 2 category.');
    if (!Number.isFinite(price) || price <= 0) return setErrorMsg('Price must be positive.');
    if (!Number.isInteger(stock) || stock < 0) return setErrorMsg('Stock must be zero or more.');
    if (!formData.description.trim()) return setErrorMsg('Product description is required.');
    if (
      formData.isOnSale &&
      (!Number.isFinite(salePrice) || salePrice <= 0 || salePrice >= price)
    ) {
      return setErrorMsg('Sale price must be positive and less than the regular price.');
    }

    // Strip out empty metadata fields so the backend receives a
    // clean payload. Also drop any trust item missing a URL.
    const cleanedTrustMedia = (formData.trustMedia || [])
      .filter((item) => item && typeof item.url === 'string' && item.url.trim())
      .map((item) => ({
        url: item.url,
        type: item.type === 'video' ? 'video' : 'image',
        caption: item.caption || '',
        customerName: item.customerName || '',
        city: item.city || '',
        ...(item.rating ? { rating: Number(item.rating) } : {}),
        ...(item.addedAt ? { addedAt: item.addedAt } : {})
      }));

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price,
        stock,
        category: formData.subSubCategory || formData.subCategory,
        images: formData.images,
        isFeatured: formData.isFeatured,
        isActive: formData.isActive,
        isCustomizable: formData.isCustomizable,
        isOnSale: formData.isOnSale,
        newIs: formData.newIs,
        trustMedia: cleanedTrustMedia,
        ...(formData.isOnSale ? { salePrice } : {})
      };

      const response = isEditMode
        ? await api.put(`/products/${id}`, payload)
        : await api.post('/products', payload);

      if (!response.success) throw new Error('Save failed');
      navigate('/admin/products');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-secondary)' }}>
      <AdminSidebar />
      <main style={{ flex: 1, padding: '2.5rem' }}>
        <Link
          to="/admin/products"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            color: 'var(--text-muted)',
            marginBottom: '0.5rem'
          }}
        >
          <ArrowLeft size={14} /> Back to Products List
        </Link>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem' }}>
          {isEditMode ? 'Edit Catalog Product' : 'Create New Product'}
        </h1>

        {errorMsg && (
          <div
            style={{
              backgroundColor: '#fce8e6',
              color: '#c5221f',
              padding: '0.85rem 1rem',
              margin: '1.5rem 0'
            }}
          >
            {errorMsg}
          </div>
        )}

        {loading && isEditMode ? (
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
              maxWidth: '900px'
            }}
          >
            {/* ============ CATEGORY ============ */}
            <section
              style={{
                border: '1px solid var(--border-light)',
                padding: '1.5rem',
                marginBottom: '2rem'
              }}
            >
              <h3>Category Hierarchy Selection</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                <Field label="Level 1 *">
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleCategoryChange}
                    required
                    className="form-select"
                  >
                    <option value="">Select L1 Category</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Level 2 *">
                  <select
                    name="subCategory"
                    value={formData.subCategory}
                    onChange={handleCategoryChange}
                    required
                    disabled={!formData.category}
                    className="form-select"
                  >
                    <option value="">Select L2 Category</option>
                    {l2Options.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Level 3 (Optional)">
                  <select
                    name="subSubCategory"
                    value={formData.subSubCategory}
                    onChange={handleChange}
                    disabled={!formData.subCategory}
                    className="form-select"
                  >
                    <option value="">None / Select L3</option>
                    {l3Options.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </section>

            {/* ============ BASICS ============ */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <Field label="Product Name *">
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
              </Field>
              <Field label="Price (PKR) *">
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  min="0.01"
                  step="0.01"
                  className="form-input"
                />
              </Field>
              <Field label="Stock Quantity *">
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  required
                  min="0"
                  step="1"
                  className="form-input"
                />
              </Field>
              {formData.isOnSale && (
                <Field label="Sale Price (PKR) *">
                  <input
                    type="number"
                    name="salePrice"
                    value={formData.salePrice}
                    onChange={handleChange}
                    required
                    min="0.01"
                    step="0.01"
                    className="form-input"
                  />
                </Field>
              )}
            </div>

            <Field label="Product Description *">
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={4}
                className="form-textarea"
              />
            </Field>

            {/* ============ PRODUCT IMAGES ============ */}
            <Field label="Product Images">
              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                  marginBottom: '1rem'
                }}
              >
                {formData.images.map((image, index) => (
                  <div key={`${image}-${index}`} style={{ position: 'relative' }}>
                    <img
                      src={image}
                      alt={`Product ${index + 1}`}
                      style={{ width: 90, height: 110, objectFit: 'cover' }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((current) => ({
                          ...current,
                          images: current.images.filter((_, i) => i !== index)
                        }))
                      }
                      style={{ position: 'absolute', top: 2, right: 2 }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <input
                  className="form-input"
                  placeholder="Enter image URL..."
                  value={imageUrlInput}
                  onChange={(event) => setImageUrlInput(event.target.value)}
                />
                <button type="button" className="btn btn-secondary" onClick={addImageUrl}>
                  <Plus size={14} /> Add URL
                </button>
              </div>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={uploadImages}
                style={{ marginTop: '0.75rem' }}
              />
              {uploading && <span> Uploading...</span>}
            </Field>

            {/* ============ CUSTOMER TRUST MEDIA ============ */}
            <section
              style={{
                border: '1px solid var(--border-light)',
                padding: '1.5rem',
                margin: '2rem 0',
                backgroundColor: '#FAFAFA'
              }}
            >
              <div style={{ marginBottom: '1rem' }}>
                <h3
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.15rem',
                    marginBottom: '0.35rem'
                  }}
                >
                  Customer Trust Media
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Upload customer screenshots, photos, or short videos (WhatsApp messages, DMs,
                  unboxings). They appear as a single sliding carousel on the product page.
                  Recommended: images 9:16 or 4:5, videos 5–15 seconds.
                </p>
              </div>

              {/* Upload row */}
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                  marginBottom: '1.25rem'
                }}
              >
                <label
                  className="btn btn-secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    cursor: uploading ? 'wait' : 'pointer',
                    opacity: uploading ? 0.6 : 1
                  }}
                >
                  <ImageIcon size={14} /> Upload Images
                  <input
                    ref={trustFileRef}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleTrustFileUpload}
                    disabled={uploading}
                    style={{ display: 'none' }}
                  />
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                  {uploading ? 'Uploading…' : 'Images and videos accepted (max 50MB each)'}
                </span>
              </div>

              {/* Existing items */}
              {formData.trustMedia.length === 0 ? (
                <div
                  style={{
                    border: '1px dashed var(--border-light)',
                    padding: '2rem 1rem',
                    textAlign: 'center',
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)'
                  }}
                >
                  No trust media yet. Add customer screenshots or videos above.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {formData.trustMedia.map((item, index) => (
                    <div
                      key={`${item.url}-${index}`}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '110px 1fr',
                        gap: '1rem',
                        padding: '1rem',
                        backgroundColor: '#fff',
                        border: '1px solid var(--border-light)'
                      }}
                    >
                      {/* Preview */}
                      <div
                        style={{
                          width: 110,
                          height: 140,
                          backgroundColor: '#EDEDED',
                          border: '1px solid #E0E0E0',
                          overflow: 'hidden',
                          position: 'relative'
                        }}
                      >
                        {item.type === 'video' ? (
                          <video
                            src={toAbsoluteUrl(item.url)}
                            muted
                            playsInline
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <img
                            src={toAbsoluteUrl(item.url)}
                            alt={`Trust ${index + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        )}
                        <span
                          className="badge badge-dark"
                          style={{
                            position: 'absolute',
                            top: 4,
                            left: 4,
                            fontSize: '0.55rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px'
                          }}
                        >
                          {item.type === 'video' ? <Video size={9} /> : <ImageIcon size={9} />}
                          {item.type}
                        </span>
                      </div>

                      {/* Fields */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', minWidth: 0 }}>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '0.6rem'
                          }}
                        >
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Customer name (e.g. Ayesha)"
                            value={item.customerName || ''}
                            onChange={(e) =>
                              updateTrustMedia(index, { customerName: e.target.value })
                            }
                            maxLength={50}
                          />
                          <input
                            type="text"
                            className="form-input"
                            placeholder="City (e.g. Lahore)"
                            value={item.city || ''}
                            onChange={(e) => updateTrustMedia(index, { city: e.target.value })}
                            maxLength={50}
                          />
                        </div>

                        <input
                          type="text"
                          className="form-input"
                          placeholder="Short caption (e.g. Loved the quality!)"
                          value={item.caption || ''}
                          onChange={(e) => updateTrustMedia(index, { caption: e.target.value })}
                          maxLength={200}
                        />

                        {/* Star rating selector */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Rating:
                          </span>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() =>
                                updateTrustMedia(index, {
                                  rating: item.rating === n ? undefined : n
                                })
                              }
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 2
                              }}
                              aria-label={`${n} star`}
                            >
                              <Star
                                size={16}
                                fill={item.rating && n <= item.rating ? '#C5A059' : 'none'}
                                color={item.rating && n <= item.rating ? '#C5A059' : '#ccc'}
                              />
                            </button>
                          ))}
                          {item.rating && (
                            <button
                              type="button"
                              onClick={() => updateTrustMedia(index, { rating: undefined })}
                              style={{
                                fontSize: '0.7rem',
                                color: 'var(--text-muted)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                textDecoration: 'underline'
                              }}
                            >
                              clear
                            </button>
                          )}
                        </div>

                        {/* Move + delete */}
                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem' }}>
                          <button
                            type="button"
                            onClick={() => moveTrustMedia(index, -1)}
                            disabled={index === 0}
                            className="btn btn-secondary btn-sm"
                            style={{ opacity: index === 0 ? 0.4 : 1 }}
                            aria-label="Move up"
                          >
                            <ChevronUp size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveTrustMedia(index, 1)}
                            disabled={index === formData.trustMedia.length - 1}
                            className="btn btn-secondary btn-sm"
                            style={{
                              opacity:
                                index === formData.trustMedia.length - 1 ? 0.4 : 1
                            }}
                            aria-label="Move down"
                          >
                            <ChevronDown size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeTrustMedia(index)}
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#C5221F', borderColor: '#ffcccc' }}
                            aria-label="Remove"
                          >
                            <Trash2 size={13} /> Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ============ FLAGS ============ */}
            <div
              style={{
                display: 'flex',
                gap: '1.5rem',
                margin: '1.5rem 0',
                flexWrap: 'wrap'
              }}
            >
              {[
                ['isFeatured', 'Featured'],
                ['isActive', 'Active in Catalog'],
                ['isCustomizable', 'Customizable'],
                ['isOnSale', 'On Sale'],
                ['newIs', 'Mark as New']
              ].map(([name, label]) => (
                <label key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input
                    type="checkbox"
                    name={name}
                    checked={formData[name]}
                    onChange={handleChange}
                  />{' '}
                  {label}
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <Link to="/admin/products" className="btn btn-secondary">
                Cancel
              </Link>
              <button type="submit" disabled={loading} className="btn btn-primary">
                {loading ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} /> Save Product
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}