import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar';
import api from '../services/api';

const emptyForm = {
  name: '', description: '', price: '', stock: '', category: '',
  subCategory: '', subSubCategory: '', images: [], isFeatured: false,
  isActive: true, isCustomizable: false, isOnSale: false, salePrice: '', newIs: false
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

  useEffect(() => {
    const load = async () => {
      try {
        const categoryResponse = await api.get('/categories');
        if (categoryResponse.success) setCategories(categoryResponse.categories || []);
        if (!isEditMode) return;
        const productResponse = await api.get(`/products/id/${id}`);
        if (!productResponse.success || !productResponse.product) throw new Error('Product not found');
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
          newIs: Boolean(product.newIs)
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
      const response = await api.post('/products/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (response.success) setFormData((current) => ({ ...current, images: [...current.images, ...(response.images || [])] }));
    } catch (err) {
      setErrorMsg(err.message || 'Image upload failed');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

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
    if (formData.isOnSale && (!Number.isFinite(salePrice) || salePrice <= 0 || salePrice >= price)) return setErrorMsg('Sale price must be positive and less than the regular price.');

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(), description: formData.description.trim(), price, stock,
        category: formData.subSubCategory || formData.subCategory, images: formData.images,
        isFeatured: formData.isFeatured, isActive: formData.isActive,
        isCustomizable: formData.isCustomizable, isOnSale: formData.isOnSale, newIs: formData.newIs,
        ...(formData.isOnSale ? { salePrice } : {})
      };
      const response = isEditMode ? await api.put(`/products/${id}`, payload) : await api.post('/products', payload);
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
        <Link to="/admin/products" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', marginBottom: '0.5rem' }}><ArrowLeft size={14} /> Back to Products List</Link>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem' }}>{isEditMode ? 'Edit Catalog Product' : 'Create New Product'}</h1>
        {errorMsg && <div style={{ backgroundColor: '#fce8e6', color: '#c5221f', padding: '0.85rem 1rem', margin: '1.5rem 0' }}>{errorMsg}</div>}
        {loading && isEditMode ? <div style={{ display: 'flex', justifyContent: 'center', padding: '6rem' }}><div className="spinner" /></div> : (
          <form onSubmit={handleSubmit} style={{ backgroundColor: '#fff', padding: '2rem', border: '1px solid var(--border-light)', maxWidth: '900px' }}>
            <section style={{ border: '1px solid var(--border-light)', padding: '1.5rem', marginBottom: '2rem' }}>
              <h3>Category Hierarchy Selection</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                <Field label="Level 1 *"><select name="category" value={formData.category} onChange={handleCategoryChange} required className="form-select"><option value="">Select L1 Category</option>{categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select></Field>
                <Field label="Level 2 *"><select name="subCategory" value={formData.subCategory} onChange={handleCategoryChange} required disabled={!formData.category} className="form-select"><option value="">Select L2 Category</option>{l2Options.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select></Field>
                <Field label="Level 3 (Optional)"><select name="subSubCategory" value={formData.subSubCategory} onChange={handleChange} disabled={!formData.subCategory} className="form-select"><option value="">None / Select L3</option>{l3Options.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select></Field>
              </div>
            </section>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <Field label="Product Name *"><input name="name" value={formData.name} onChange={handleChange} required className="form-input" /></Field>
              <Field label="Price (PKR) *"><input type="number" name="price" value={formData.price} onChange={handleChange} required min="0.01" step="0.01" className="form-input" /></Field>
              <Field label="Stock Quantity *"><input type="number" name="stock" value={formData.stock} onChange={handleChange} required min="0" step="1" className="form-input" /></Field>
              {formData.isOnSale && <Field label="Sale Price (PKR) *"><input type="number" name="salePrice" value={formData.salePrice} onChange={handleChange} required min="0.01" step="0.01" className="form-input" /></Field>}
            </div>
            <Field label="Product Description *"><textarea name="description" value={formData.description} onChange={handleChange} required rows={4} className="form-textarea" /></Field>
            <Field label="Product Images"><div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>{formData.images.map((image, index) => <div key={`${image}-${index}`} style={{ position: 'relative' }}><img src={image} alt={`Product ${index + 1}`} style={{ width: 90, height: 110, objectFit: 'cover' }} /><button type="button" onClick={() => setFormData((current) => ({ ...current, images: current.images.filter((_, i) => i !== index) }))} style={{ position: 'absolute', top: 2, right: 2 }}><Trash2 size={12} /></button></div>)}</div><div style={{ display: 'flex', gap: '0.75rem' }}><input className="form-input" placeholder="Enter image URL..." value={imageUrlInput} onChange={(event) => setImageUrlInput(event.target.value)} /><button type="button" className="btn btn-secondary" onClick={addImageUrl}><Plus size={14} /> Add URL</button></div><input type="file" multiple accept="image/*" onChange={uploadImages} style={{ marginTop: '0.75rem' }} />{uploading && <span> Uploading...</span>}</Field>
            <div style={{ display: 'flex', gap: '1.5rem', margin: '1.5rem 0', flexWrap: 'wrap' }}>{[['isFeatured', 'Featured'], ['isActive', 'Active in Catalog'], ['isCustomizable', 'Customizable'], ['isOnSale', 'On Sale'], ['newIs', 'Mark as New']].map(([name, label]) => <label key={name}><input type="checkbox" name={name} checked={formData[name]} onChange={handleChange} /> {label}</label>)}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}><Link to="/admin/products" className="btn btn-secondary">Cancel</Link><button type="submit" disabled={loading} className="btn btn-primary"><Save size={16} /> {loading ? 'Saving...' : 'Save Product'}</button></div>
          </form>
        )}
      </main>
    </div>
  );
}

function Field({ label, children }) {
  return <div className="form-group" style={{ marginBottom: '1.25rem' }}><label className="form-label">{label}</label>{children}</div>;
}
