import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ShoppingBag, Truck, ShieldCheck, ChevronRight, Check, MapPin, ChevronDown } from 'lucide-react';
import { addToCart } from '../store/slices/cartSlice';
import {
  fetchProductBySlug,
  fetchRelatedProducts,
  selectProductBySlug,
  selectRelatedProducts
} from '../store/slices/productsSlice';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/product/ProductCard';
import ReviewSection from '../components/product/ReviewSection';
import api from '../services/api';

export default function ProductDetail() {
  const dispatch = useDispatch();
  const { slug } = useParams();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';

  const product = useSelector((state) => selectProductBySlug(state, slug));
  const relatedProducts = useSelector((state) => selectRelatedProducts(state, product?._id)) || [];

  const [activeImage, setActiveImage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(!product);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [cartError, setCartError] = useState('');
  const [prescriptionText, setPrescriptionText] = useState('');
  const [prescriptionImage, setPrescriptionImage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [lensOptions, setLensOptions] = useState([]);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(5000);
  const [selectedLensIdx, setSelectedLensIdx] = useState(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const formatDate = (date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const getDeliveryDates = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const addDays = (days) => {
      const date = new Date(today);
      date.setDate(today.getDate() + days);
      return date;
    };

    const containsSunday = Array.from({ length: 6 }, (_, index) => addDays(index)).some(
      (date) => date.getDay() === 0
    );

    return {
      ordered: formatDate(today),
      shipped: `${formatDate(addDays(1))} – ${formatDate(addDays(2))}`,
      delivered: `${formatDate(addDays(3))} – ${formatDate(addDays(containsSunday ? 6 : 5))}`
    };
  };

  const deliveryDates = getDeliveryDates();

  useEffect(() => {
    if (product) {
      setActiveImage(product.images?.[0] || '');
      setLoading(false);
    }
  }, [product]);

  useEffect(() => {
    const loadDetail = async () => {
      setQuantity(1);
      setPrescriptionText('');
      setPrescriptionImage('');
      setUploadError('');
      setSelectedLensIdx(null);
      setCustomizeOpen(false);

      if (!product) {
        setLoading(true);
        await dispatch(fetchProductBySlug(slug));
      }
    };

    loadDetail();
  }, [dispatch, slug]);

  useEffect(() => {
    if (product?._id && (!relatedProducts || relatedProducts.length === 0)) {
      dispatch(fetchRelatedProducts(product._id));
    }
  }, [dispatch, product?._id]);

  useEffect(() => {
    const fetchLensOptions = async () => {
      try {
        const res = await api.get('/site-content/homepage');
        if (res.success) {
          if (Array.isArray(res.content?.store?.lensOptions)) {
            setLensOptions(res.content.store.lensOptions);
          }
          const threshold = res.content?.store?.freeShippingThreshold;
          if (typeof threshold === 'number' && Number.isFinite(threshold)) {
            setFreeShippingThreshold(threshold);
          }
        }
      } catch (err) {
        // Non-blocking
      }
    };
    fetchLensOptions();

    setSelectedLensIdx(null);
  }, [slug]);

  const handleAddToCart = async () => {
    if (!product) return;
    setCartError('');

    let customization;
    if (product.isCustomizable) {
      const desc = prescriptionText.trim();
      const img = prescriptionImage;
      const selectedLens =
        selectedLensIdx !== null ? lensOptions[selectedLensIdx] : null;

      if ((desc || img) && !selectedLens) {
        setCartError('Please select a lens type for your prescription');
        return;
      }
      if (selectedLens && !desc && !img) {
        setCartError('Please provide your prescription to continue with a lens selection');
        return;
      }

      if (desc || img || selectedLens) {
        customization = {
          description: desc.slice(0, 2000),
          prescriptionImage: img
        };
        if (selectedLens) {
          customization.lensOption = {
            name: selectedLens.name || '',
            description: selectedLens.description || '',
            price: Number(selectedLens.price) || 0
          };
        }
      }
    }

    try {
      await dispatch(addToCart({ product, quantity, customization })).unwrap();
      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 3000);
      setPrescriptionText('');
      setPrescriptionImage('');
      setSelectedLensIdx(null);
    } catch (err) {
      setCartError(err.message || 'Failed to add item to cart');
    }
  };

  const handlePrescriptionImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await api.post('/cart/prescription-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.success && res.url) {
        setPrescriptionImage(res.url);
      } else {
        setUploadError('Upload failed — please try again');
      }
    } catch (err) {
      setUploadError(err.message || 'Upload failed — please try again');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemovePrescriptionImage = () => {
    setPrescriptionImage('');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8rem' }} className="pdp-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container pdp-notfound" style={{ textAlign: 'center', padding: '6rem 1.5rem' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem' }}>
          Product Not Found
        </h2>
        <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
          The requested product does not exist or has been retired.
        </p>
        <Link
          to="/products"
          className="btn btn-primary"
          style={{ marginTop: '1.5rem' }}
        >
          Back to Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="container pdp-page" style={{ padding: '3rem 1.5rem' }}>
      {/* Breadcrumbs */}
      <div
        className="pdp-breadcrumbs"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          marginBottom: '2.5rem'
        }}
      >
        <Link to="/">Home</Link> <ChevronRight size={12} />
        <Link to="/products">Catalog</Link> <ChevronRight size={12} />
        <Link to={`/products?category=${product.category?.slug}`}>
          {product.category?.name}
        </Link>{' '}
        <ChevronRight size={12} />
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
          {product.name}
        </span>
      </div>

      {/* Main Product Layout */}
      <div
        className="pdp-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '1.1fr 1fr',
          gap: '4rem',
          alignItems: 'start'
        }}
      >
        {/* Left Image Gallery */}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              aspectRatio: '4/5',
              width: '100%',
              overflow: 'hidden',
              marginBottom: '1rem'
            }}
          >
            <img
              src={
                activeImage ||
                'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1000&auto=format&fit=crop'
              }
              alt={product.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </div>

          {/* Thumbnail Strip */}
          {product.images && product.images.length > 1 && (
            <div className="pdp-thumbs" style={{ display: 'flex', gap: '1rem' }}>
              {product.images.map((imgUrl, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(imgUrl)}
                  style={{
                    width: '80px',
                    height: '100px',
                    border:
                      activeImage === imgUrl
                        ? '2px solid var(--text-primary)'
                        : '1px solid var(--border-light)',
                    overflow: 'hidden',
                    padding: 0
                  }}
                >
                  <img
                    src={imgUrl}
                    alt={`Thumbnail ${idx + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Product Information */}
        <div style={{ minWidth: 0 }}>
          <span
            style={{
              fontSize: '0.75rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              fontWeight: 600
            }}
          >
            {product.category?.name}{' '}
            {product.subCategory ? ` / ${product.subCategory.name}` : ''}
          </span>

          <h1
            className="pdp-title"
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '2.4rem',
              fontWeight: 400,
              margin: '0.5rem 0 1rem 0',
              lineHeight: '1.2'
            }}
          >
            {product.name}
          </h1>

          <div
            className="pdp-price-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: product.isOnSale === true ? '0.4rem' : 0,
                fontSize: '1.75rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap'
              }}
            >
              {product.isOnSale === true && (
                <span
                  style={{
                    fontSize: '1rem',
                    fontWeight: 500,
                    color: 'var(--text-muted)',
                    textDecoration: 'line-through'
                  }}
                >
                  PKR {product.price?.toLocaleString()}
                </span>
              )}
              {product.isOnSale === true
                ? `PKR ${product.salePrice?.toLocaleString() ?? '0'}`
                : `PKR ${product.price?.toLocaleString() ?? '0'}`}
            </span>

            {product.stock > 0 ? (
              <span className="badge badge-success">
                In Stock ({product.stock} units)
              </span>
            ) : (
              <span className="badge badge-danger">Out of Stock</span>
            )}
          </div>

          <p
            style={{
              fontSize: '0.95rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.7',
              marginBottom: '2rem',
              borderTop: '1px solid var(--border-light)',
              paddingTop: '1.5rem'
            }}
          >
            {product.description}
          </p>

          {/* Customization — only for customizable products */}
          {product.isCustomizable && !isSuperAdmin && (
            <div
              style={{
                marginBottom: '2rem',
                padding: '1.5rem',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              {/* Header row with toggle on the top-right */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  marginBottom: customizeOpen ? '1.25rem' : '0'
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <h3
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '1.15rem',
                      fontWeight: 400,
                      marginBottom: '0.4rem',
                      color: 'var(--text-primary)'
                    }}
                  >
                    Customize Your Lenses
                  </h3>
                  <p
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                      lineHeight: '1.5'
                    }}
                  >
                    Optional — leave blank if you want the frame without lenses.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setCustomizeOpen((v) => !v)}
                  aria-expanded={customizeOpen}
                  aria-controls="pdp-customize-panel"
                  aria-label={customizeOpen ? 'Collapse lens customization' : 'Expand lens customization'}
                  style={{
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.4rem 0.75rem',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-primary)',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'background-color var(--transition-fast), border-color var(--transition-fast)'
                  }}
                >
                  {customizeOpen ? 'Hide' : 'Customize'}
                  <ChevronDown
                    size={14}
                    style={{
                      transition: 'transform 0.2s ease',
                      transform: customizeOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}
                  />
                </button>
              </div>

              {/* Collapsible content — only rendered when open */}
              {customizeOpen && (
                <div id="pdp-customize-panel">
                  {/* Prescription text */}
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      marginBottom: '0.5rem',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    Prescription Details / Instructions
                  </label>
                  <textarea
                    value={prescriptionText}
                    onChange={(e) => setPrescriptionText(e.target.value)}
                    rows={4}
                    maxLength={2000}
                    placeholder="e.g. Left: -1.50, Right: -2.00, Cyl: -0.50 — or any instructions from your doctor."
                    className="form-textarea"
                    style={{
                      width: '100%',
                      fontSize: '0.85rem',
                      padding: '0.75rem 0.9rem',
                      marginBottom: '0.4rem'
                    }}
                    disabled={uploading}
                  />
                  <p
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--text-muted)',
                      marginBottom: '1.25rem',
                      textAlign: 'right'
                    }}
                  >
                    {prescriptionText.length} / 2000
                  </p>

                  {/* Prescription image upload */}
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      marginBottom: '0.5rem',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    Or Upload a Picture of Your Prescription
                  </label>

                  {prescriptionImage ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.6rem 0.9rem',
                        border: '1px solid var(--border-light)',
                        backgroundColor: 'var(--bg-primary)',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '1rem'
                      }}
                    >
                      <img
                        src={prescriptionImage}
                        alt="Prescription preview"
                        style={{
                          width: '48px',
                          height: '48px',
                          objectFit: 'cover',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-light)'
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: 'var(--text-primary)'
                          }}
                        >
                          Prescription attached
                        </div>
                        <div
                          style={{
                            fontSize: '0.7rem',
                            color: 'var(--text-muted)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {prescriptionImage.split('/').pop()}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemovePrescriptionImage}
                        style={{
                          fontSize: '0.7rem',
                          color: '#c53030',
                          padding: '0.4rem 0.6rem',
                          border: '1px solid #feb2b2',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          background: 'transparent'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.7rem 1.2rem',
                        border: '1px dashed var(--border-light)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)',
                        cursor: uploading ? 'wait' : 'pointer',
                        backgroundColor: 'var(--bg-primary)',
                        marginBottom: '1rem'
                      }}
                    >
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handlePrescriptionImageUpload}
                        disabled={uploading}
                        style={{ display: 'none' }}
                      />
                      {uploading ? 'Uploading…' : '+ Choose Image'}
                    </label>
                  )}

                  {uploadError && (
                    <p
                      style={{
                        fontSize: '0.75rem',
                        color: '#c53030',
                        marginTop: '-0.5rem',
                        marginBottom: '1rem'
                      }}
                    >
                      {uploadError}
                    </p>
                  )}

                  {/* Cylinder note */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.6rem',
                      paddingTop: '1rem',
                      borderTop: '1px solid var(--border-light)',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      lineHeight: '1.6'
                    }}
                  >
                    <span style={{ flexShrink: 0, marginTop: '1px' }}>ⓘ</span>
                    <span>
                      If your prescription includes a <strong>cylinder / cylindrical</strong>{' '}
                      number, we will contact you on WhatsApp to confirm before dispatching
                      your order.
                    </span>
                  </div>

                  {/* Lens Options — only when the admin configured them */}
                  {lensOptions.length > 0 && (
                    <div
                      style={{
                        marginTop: '1.25rem',
                        paddingTop: '1rem',
                        borderTop: '1px solid var(--border-light)'
                      }}
                    >
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          marginBottom: '0.75rem',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        Select Lens Type
                      </label>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {lensOptions.map((opt, idx) => {
                          const isSelected = selectedLensIdx === idx;
                          return (
                            <label
                              key={idx}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.75rem',
                                padding: '0.75rem 0.9rem',
                                border: isSelected
                                  ? '2px solid var(--text-primary)'
                                  : '1px solid var(--border-light)',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: 'var(--bg-primary)',
                                cursor: 'pointer',
                                transition: 'border-color 0.15s'
                              }}
                            >
                              <input
                                type="radio"
                                name="lensOption"
                                checked={isSelected}
                                onChange={() => setSelectedLensIdx(idx)}
                                style={{
                                  marginTop: '3px',
                                  flexShrink: 0,
                                  cursor: 'pointer'
                                }}
                              />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'baseline',
                                    gap: '0.5rem',
                                    flexWrap: 'wrap'
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: '0.85rem',
                                      fontWeight: 700,
                                      color: 'var(--text-primary)'
                                    }}
                                  >
                                    {opt.name}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: '0.85rem',
                                      fontWeight: 700,
                                      color: opt.price > 0 ? 'var(--text-primary)' : '#137333',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {opt.price > 0
                                      ? `+PKR ${Number(opt.price).toLocaleString()}`
                                      : 'Free'}
                                  </span>
                                </div>
                                {opt.description && (
                                  <p
                                    style={{
                                      fontSize: '0.75rem',
                                      color: 'var(--text-muted)',
                                      lineHeight: '1.5',
                                      marginTop: '0.25rem'
                                    }}
                                  >
                                    {opt.description}
                                  </p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Quantity & Add to Cart Controls */}
          {isSuperAdmin ? (
            <div
              style={{
                marginBottom: '2rem',
                padding: '1rem 1.25rem',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                lineHeight: '1.6'
              }}
            >
              <strong style={{ color: 'var(--text-primary)' }}>
                Admin Preview Mode.
              </strong>{' '}
              You are viewing this product as the Super Admin. Sign in with a
              customer account to add items to a cart and place orders.
            </div>
          ) : (
            <div style={{ marginBottom: '2rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '0.5rem',
                  color: 'var(--text-secondary)'
                }}
              >
                Select Quantity
              </label>

              <div
                className="pdp-qty-row"
                style={{
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'center'
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    border: '1px solid var(--border-light)'
                  }}
                >
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    style={{
                      padding: '0.6rem 1.2rem',
                      fontSize: '1.1rem'
                    }}
                    disabled={product.stock <= 0}
                  >
                    -
                  </button>

                  <span
                    style={{
                      padding: '0.6rem 1.2rem',
                      fontWeight: 700,
                      fontSize: '1rem'
                    }}
                  >
                    {quantity}
                  </span>

                  <button
                    onClick={() =>
                      setQuantity(Math.min(product.stock, quantity + 1))
                    }
                    style={{
                      padding: '0.6rem 1.2rem',
                      fontSize: '1.1rem'
                    }}
                    disabled={product.stock <= 0 || quantity >= product.stock}
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={product.stock <= 0}
                  className="btn btn-primary"
                  style={{
                    flex: 1,
                    padding: '0.9rem 1.5rem',
                    fontSize: '0.875rem'
                  }}
                >
                  {addedSuccess ? (
                    <>
                      <Check size={18} /> Added to Shopping Bag
                    </>
                  ) : (
                    <>
                      <ShoppingBag size={18} /> Add to Shopping Bag
                    </>
                  )}
                </button>
              </div>

              {cartError && (
                <p
                  style={{
                    marginTop: '0.75rem',
                    color: '#c53030',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}
                >
                  {cartError}
                </p>
              )}
            </div>
          )}

          {/* Value Banners */}
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              padding: '1.5rem',
              border: '1px solid var(--border-light)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)'
              }}
            >
              <Truck
                size={20}
                style={{
                  color: 'var(--text-primary)',
                  flexShrink: 0,
                  marginTop: '2px'
                }}
              />
              <span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  Cash on Delivery (COD)
                </strong>{' '}
                available nationwide. Free shipping on orders over PKR{' '}
                {freeShippingThreshold.toLocaleString()}.
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)'
              }}
            >
              <ShieldCheck
                size={20}
                style={{
                  color: 'var(--text-primary)',
                  flexShrink: 0,
                  marginTop: '2px'
                }}
              />
              <span>
                100% guaranteed authentic product. Inspect your parcel upon
                delivery before paying.
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                borderTop: '1px solid var(--border-light)',
                paddingTop: '1rem'
              }}
            >
              <ShieldCheck
                size={20}
                style={{
                  color: 'var(--accent-gold)',
                  flexShrink: 0,
                  marginTop: '2px'
                }}
              />
              <span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  Replacement Guarantee.
                </strong>{' '}
                If your order arrives incorrect, damaged, or broken, contact us
                on WhatsApp and we will arrange a replacement. Please note — we
                do not offer cash refunds.
              </span>
            </div>

            <div className="pdp-delivery-stepper">
              <div className="pdp-delivery-steps">
                <div className="pdp-delivery-step">
                  <div className="pdp-delivery-icon">
                    <ShoppingBag size={16} />
                  </div>
                  <strong>ORDERED</strong>
                  <span>{deliveryDates.ordered}</span>
                </div>
                <div className="pdp-delivery-connector pdp-delivery-connector-active" />
                <div className="pdp-delivery-step">
                  <div className="pdp-delivery-icon">
                    <Truck size={16} />
                  </div>
                  <strong>SHIPPED</strong>
                  <span>{deliveryDates.shipped}</span>
                </div>
                <div className="pdp-delivery-connector" />
                <div className="pdp-delivery-step">
                  <div className="pdp-delivery-icon">
                    <MapPin size={16} />
                  </div>
                  <strong>DELIVERED</strong>
                  <span>{deliveryDates.delivered}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Reviews Section — centered on desktop via .pdp-reviews */}
        <div className="pdp-reviews">
          <ReviewSection productId={product._id} productName={product.name} />
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div
            className="pdp-related"
            style={{
              marginTop: '6rem',
              borderTop: '1px solid var(--border-light)',
              paddingTop: '4rem'
            }}
          >
            <h3
              className="pdp-related-title"
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.8rem',
                marginBottom: '2rem'
              }}
            >
              Complementary House Pieces
            </h3>

            <div className="grid-products">
              {relatedProducts.map((rel) => (
                <ProductCard key={rel._id} product={rel} />
              ))}
            </div>
          </div>
        )}

        <style>{`
          /* Responsive fixes only — no other changes */
          .pdp-grid > div {
            min-width: 0;
          }

          @media (max-width: 900px) {
            .pdp-grid {
              grid-template-columns: minmax(0, 1fr) !important;
              gap: 2rem !important;
            }
          }

          @media (max-width: 640px) {
            .pdp-page {
              padding: 2rem 1rem !important;
            }
            .pdp-loading {
              padding: 5rem 1rem !important;
            }
            .pdp-notfound {
              padding: 4rem 1rem !important;
            }
            .pdp-breadcrumbs {
              flex-wrap: wrap !important;
              row-gap: 0.25rem !important;
              margin-bottom: 1.75rem !important;
              font-size: 0.75rem !important;
            }
            .pdp-breadcrumbs > span {
              overflow-wrap: anywhere;
            }
            .pdp-title {
              font-size: 1.75rem !important;
            }
            .pdp-price-row {
              flex-wrap: wrap !important;
              gap: 0.5rem !important;
            }
            .pdp-price-row > span:first-child {
              white-space: normal !important;
            }
            .pdp-delivery-steps {
              flex-direction: column !important;
              align-items: stretch !important;
              gap: 0.5rem !important;
            }
            .pdp-delivery-connector {
              width: 2px !important;
              height: 1.25rem !important;
              min-width: 2px !important;
              min-height: 1.25rem !important;
              margin: 0 0 0 1rem !important;
            }
            .pdp-thumbs {
              flex-wrap: wrap !important;
              gap: 0.6rem !important;
            }
            .pdp-thumbs > button {
              width: 64px !important;
              height: 80px !important;
            }
            .pdp-qty-row {
              flex-wrap: wrap !important;
            }
            .pdp-qty-row > button.btn {
              width: 100% !important;
              flex: 1 1 100% !important;
              justify-content: center !important;
            }
            .pdp-related {
              margin-top: 3rem !important;
              padding-top: 2rem !important;
            }
            .pdp-related-title {
              font-size: 1.4rem !important;
              margin-bottom: 1.25rem !important;
            }
          }

          @media (max-width: 400px) {
            .pdp-title {
              font-size: 1.5rem !important;
            }
            .pdp-price-row > span:first-child {
              font-size: 1.4rem !important;
            }
          }

          .pdp-delivery-stepper {
            border-top: 1px solid var(--border-light);
            padding-top: 1rem;
          }
          .pdp-delivery-steps {
            display: flex;
            align-items: flex-start;
            gap: 0.5rem;
          }
          .pdp-delivery-step {
            display: flex;
            flex: 1;
            min-width: 0;
            flex-direction: column;
            align-items: center;
            gap: 0.3rem;
            text-align: center;
          }
          .pdp-delivery-step strong {
            color: var(--text-primary);
            font-size: 0.68rem;
            letter-spacing: 0.08em;
          }
          .pdp-delivery-step > span {
            color: var(--text-muted);
            font-size: 0.7rem;
            line-height: 1.35;
          }
          .pdp-delivery-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 2rem;
            height: 2rem;
            border: 1px solid var(--text-primary);
            border-radius: 50%;
            color: var(--text-primary);
          }
          .pdp-delivery-connector {
            flex: 1;
            min-width: 1rem;
            height: 2px;
            margin-top: 1rem;
            background-color: var(--border-light);
          }
          .pdp-delivery-connector-active {
            background-color: #C5221F;
          }

          /* Desktop-only: center the Customer Reviews section horizontally
             across the full width of the PDP grid. Mobile and tablet are
             untouched — the media queries above still control those. */
          @media (min-width: 1025px) {
            .pdp-grid > .pdp-reviews {
              grid-column: 1 / -1;
              width: 100%;
              display: flex;
              justify-content: center;
            }
            .pdp-reviews > * {
              width: 100%;
              max-width: 900px;
            }
          }
        `}</style>
      </div>
    </div>
  );
}