import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ShieldCheck, Truck, ArrowLeft, CheckCircle } from 'lucide-react';
import { selectCart, clearCart } from '../store/slices/cartSlice';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function CheckoutPage() {
  const dispatch = useDispatch();
  const cart = useSelector(selectCart);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: user?.addresses?.[0]?.phone || '',
    street: user?.addresses?.[0]?.street || '',
    city: user?.addresses?.[0]?.city || '',
    state: user?.addresses?.[0]?.state || 'Punjab',
    postalCode: user?.addresses?.[0]?.postalCode || '',
    country: 'Pakistan',
    orderNotes: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [codEnabled, setCodEnabled] = useState(true);
  const [codFee, setCodFee] = useState(300);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(5000);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await api.get('/site-content/homepage');
        if (res.success && res.content?.store) {
          const s = res.content.store;
          if (typeof s.codEnabled === 'boolean') setCodEnabled(s.codEnabled);
          if (typeof s.codFee === 'number') setCodFee(s.codFee);
          if (typeof s.freeShippingThreshold === 'number')
            setFreeShippingThreshold(s.freeShippingThreshold);
        }
      } catch {
        // silently keep fallbacks
      }
    };
    loadSettings();
  }, []);

  const shippingCost = cart.subtotal >= freeShippingThreshold ? 0 : codFee;
  const grandTotal = cart.subtotal + shippingCost;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (cart.items.length === 0) {
      setErrorMsg('Your shopping bag is empty.');
      return;
    }

    if (!codEnabled) {
      setErrorMsg('Cash on Delivery is currently unavailable. Please try again later.');
      return;
    }

    setSubmitting(true);

    try {
      const orderPayload = {
        customerEmail: formData.email,
        items: cart.items.map((item) => {
          const orderItem = {
            productId: item.product._id,
            name: item.product.name,
            quantity: item.quantity,
            image: item.product.images?.[0] || ''
          };
          if (item.customization) {
            const custom = {
              description: item.customization.description || '',
              prescriptionImage: item.customization.prescriptionImage || ''
            };
            if (item.customization.lensOption) {
              custom.lensOption = {
                name: item.customization.lensOption.name || '',
                description: item.customization.lensOption.description || '',
                price: Number(item.customization.lensOption.price) || 0
              };
            }
            orderItem.customization = custom;
          }
          return orderItem;
        }),
        shippingAddress: {
          fullName: formData.fullName,
          phone: formData.phone,
          street: formData.street,
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode,
          country: formData.country
        },
        orderNotes: formData.orderNotes
      };

      const res = await api.post('/orders', orderPayload);

      if (res.success) {
        dispatch(clearCart());
        navigate(`/order-confirmation?orderId=${res.order.orderId}`);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="container checkout-empty">
        <h2 className="checkout-empty-title">Shopping Bag is Empty</h2>
        <p className="checkout-empty-text">
          Please add items to your cart before proceeding to checkout.
        </p>
        <Link to="/products" className="btn btn-primary checkout-empty-btn">
          Return to Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="container checkout-page">
      <div className="checkout-header">
        <Link to="/cart" className="checkout-back">
          <ArrowLeft size={14} /> Back to Bag
        </Link>
        <h1 className="checkout-title">Checkout — Cash on Delivery</h1>
      </div>

      {errorMsg && <div className="checkout-alert checkout-alert--error">{errorMsg}</div>}

      {!codEnabled && (
        <div className="checkout-alert checkout-alert--warn">
          Cash on Delivery is temporarily unavailable. Please check back later or contact support.
        </div>
      )}

      <form onSubmit={handleSubmitOrder} className="checkout-layout">
        {/* Shipping Form */}
        <div className="checkout-form">
          <h3 className="checkout-section-title">1. Delivery Address &amp; Contact</h3>

          <div className="checkout-row checkout-row--2">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="e.g. Alexander Wright"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="e.g. 0300 1234567"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Email Address (For Confirmation &amp; Courier Tracking) *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="form-input"
              placeholder="e.g. alexander@example.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Street Address / Suite / Landmark *</label>
            <input
              type="text"
              name="street"
              value={formData.street}
              onChange={handleChange}
              required
              className="form-input"
              placeholder="e.g. House 14, Street 7, Sector F-8/3"
            />
          </div>

          <div className="checkout-row checkout-row--3">
            <div className="form-group">
              <label className="form-label">City *</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="e.g. Islamabad"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Province / State</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g. Federal"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Postal Code *</label>
              <input
                type="text"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="e.g. 44000"
              />
            </div>
          </div>

          <h3 className="checkout-section-title checkout-section-title--spaced">
            2. Payment Method
          </h3>

          {codEnabled ? (
            <div className="checkout-cod-box">
              <div className="checkout-cod-left">
                <CheckCircle size={20} style={{ color: 'var(--bg-dark)', flexShrink: 0 }} />
                <div>
                  <h4 className="checkout-cod-title">Cash on Delivery (COD)</h4>
                  <p className="checkout-cod-desc">
                    Pay cash to courier agent upon parcel delivery &amp; inspection.
                  </p>
                </div>
              </div>
              <span className="badge badge-dark">Active</span>
            </div>
          ) : (
            <div className="checkout-cod-disabled">
              Cash on Delivery is currently unavailable. Please try again later.
            </div>
          )}

          <div className="form-group" style={{ marginTop: '1.5rem' }}>
            <label className="form-label">
              Delivery Notes / Special Instructions (Optional)
            </label>
            <textarea
              name="orderNotes"
              value={formData.orderNotes}
              onChange={handleChange}
              rows={3}
              className="form-textarea"
              placeholder="e.g. Please call before arrival or leave with security gate."
            />
          </div>
        </div>

        {/* Order Review Sidebar */}
        <aside className="checkout-sidebar">
          <div className="checkout-summary">
            <h3 className="checkout-summary-title">Items Summary</h3>

            <div className="checkout-items">
              {cart.items.map((item, idx) => (
                <div
                  key={`${item.product._id}-${idx}`}
                  className="checkout-item"
                >
                  {/* Top row: thumbnail + name */}
                  <div className="checkout-item-top">
                    <img
                      src={
                        item.product.images?.[0] ||
                        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1000&auto=format&fit=crop'
                      }
                      alt={item.product.name}
                      className="checkout-item-img"
                    />
                    <h5 className="checkout-item-name">{item.product.name}</h5>
                  </div>

                  {/* Price breakdown rows */}
                  <div className="checkout-item-breakdown">
                    <div className="checkout-price-row">
                      <span className="checkout-price-label">
                        {item.customization?.lensOption ? 'Frame' : 'Price'}
                      </span>
                      <span className="checkout-price-value">
                        {item.product.isOnSale === true ? (
                          <>
                            <span
                              style={{
                                color: 'var(--text-muted)',
                                fontWeight: 500,
                                textDecoration: 'line-through',
                                marginRight: '0.35rem'
                              }}
                            >
                              PKR {item.product.price.toLocaleString()}
                            </span>
                            <strong>PKR {item.product.salePrice.toLocaleString()}</strong>
                          </>
                        ) : (
                          `PKR ${item.product.price.toLocaleString()}`
                        )}
                      </span>
                    </div>

                    {item.customization?.lensOption && (
                      <div className="checkout-price-row">
                        <span className="checkout-price-label">
                          Lens ({item.customization.lensOption.name})
                        </span>
                        <span className="checkout-price-value">
                          {item.customization.lensOption.price > 0
                            ? `+PKR ${Number(
                                item.customization.lensOption.price
                              ).toLocaleString()}`
                            : 'Free'}
                        </span>
                      </div>
                    )}

                    <div className="checkout-price-row">
                      <span className="checkout-price-label">Quantity</span>
                      <span className="checkout-price-value">{item.quantity}</span>
                    </div>

                    <div className="checkout-price-total-row">
                      <span>Total</span>
                      <span>
                        PKR {item.itemTotal.toLocaleString()}
                      </span>
                    </div>

                    {item.customization &&
                      (item.customization.description ||
                        item.customization.prescriptionImage) && (
                        <p className="checkout-item-rx" style={{ marginTop: '0.35rem' }}>
                          <strong>Rx:</strong>{' '}
                          {item.customization.description
                            ? item.customization.description.length > 60
                              ? `${item.customization.description.slice(0, 60)}…`
                              : item.customization.description
                            : 'Image attached'}
                          {item.customization.prescriptionImage && (
                            <span
                              style={{
                                color: 'var(--accent-gold)',
                                marginLeft: '0.25rem'
                              }}
                            >
                              📎
                            </span>
                          )}
                        </p>
                      )}
                  </div>
                </div>
              ))}
            </div>

            <div className="checkout-totals">
              <div className="checkout-total-row">
                <span>Subtotal</span>
                <span>PKR {cart.subtotal.toLocaleString()}</span>
              </div>
              <div className="checkout-total-row">
                <span>Shipping</span>
                <span>{shippingCost === 0 ? 'FREE' : `PKR ${shippingCost}`}</span>
              </div>
              {shippingCost > 0 && (
                <p className="checkout-ship-note">
                  Free shipping on orders of PKR {freeShippingThreshold.toLocaleString()} or
                  more.
                </p>
              )}
              <div className="checkout-grand-total">
                <span>Grand Total</span>
                <span>PKR {grandTotal.toLocaleString()}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !codEnabled}
              className="btn btn-primary btn-full checkout-submit"
              style={{
                opacity: !codEnabled ? 0.5 : 1,
                cursor: !codEnabled ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting
                ? 'Confirming Order...'
                : codEnabled
                ? 'Confirm COD Order'
                : 'COD Unavailable'}
            </button>
          </div>
        </aside>
      </form>

      <style>{`
        /* === Page base === */
        .checkout-page {
          padding: 3rem 1.5rem;
        }
        .checkout-header {
          margin-bottom: 2.5rem;
        }
        .checkout-back {
          font-size: 0.8rem;
          color: var(--text-muted);
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 0.5rem;
        }
        .checkout-title {
          font-family: var(--font-serif);
          font-size: 2.2rem;
          line-height: 1.2;
        }

        /* === Alerts === */
        .checkout-alert {
          padding: 1rem;
          border-radius: var(--radius-sm);
          margin-bottom: 2rem;
          font-size: 0.875rem;
        }
        .checkout-alert--error {
          background-color: #fce8e6;
          color: #c5221f;
        }
        .checkout-alert--warn {
          background-color: #fff5f5;
          border: 1px solid #feb2b2;
          color: #c53030;
        }

        /* === Layout === */
        .checkout-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 380px;
          gap: 3rem;
          align-items: start;
        }
        .checkout-form {
          min-width: 0;
        }
        .checkout-sidebar {
          min-width: 0;
        }

        /* === Section headings === */
        .checkout-section-title {
          font-family: var(--font-serif);
          font-size: 1.4rem;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid var(--border-light);
          padding-bottom: 0.75rem;
        }
        .checkout-section-title--spaced {
          margin: 2.5rem 0 1.5rem 0;
        }

        /* === Form rows === */
        .checkout-row {
          display: grid;
          gap: 1.25rem;
        }
        .checkout-row--2 {
          grid-template-columns: 1fr 1fr;
        }
        .checkout-row--3 {
          grid-template-columns: 1fr 1fr 1fr;
        }

        .checkout-page .form-input,
        .checkout-page .form-textarea,
        .checkout-page select {
          width: 100%;
          box-sizing: border-box;
        }

        /* === COD payment box === */
        .checkout-cod-box {
          border: 2px solid var(--bg-dark);
          padding: 1.25rem;
          background-color: var(--bg-secondary);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .checkout-cod-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          min-width: 0;
        }
        .checkout-cod-title {
          font-size: 0.9rem;
          font-weight: 700;
        }
        .checkout-cod-desc {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        .checkout-cod-disabled {
          border: 1px solid #feb2b2;
          padding: 1.25rem;
          background-color: #fff5f5;
          color: #c53030;
          font-size: 0.85rem;
          border-radius: var(--radius-sm);
        }

        /* === Summary card === */
        .checkout-summary {
          background-color: var(--bg-secondary);
          padding: 1.75rem;
          border: 1px solid var(--border-light);
        }
        .checkout-summary-title {
          font-family: var(--font-serif);
          font-size: 1.25rem;
          margin-bottom: 1.25rem;
          border-bottom: 1px solid var(--border-light);
          padding-bottom: 0.75rem;
        }

        /* Items list */
        .checkout-items {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          max-height: 420px;
          overflow-y: auto;
          margin-bottom: 1.5rem;
          padding-right: 0.5rem;
        }
        .checkout-item {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border-light);
        }
        .checkout-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
        .checkout-item-top {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .checkout-item-img {
          width: 56px;
          height: 70px;
          object-fit: cover;
          flex-shrink: 0;
        }
        .checkout-item-name {
          flex: 1;
          min-width: 0;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-primary);
          overflow-wrap: anywhere;
          margin: 0;
        }

        /* Price breakdown */
        .checkout-item-breakdown {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .checkout-price-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 0.5rem;
          font-size: 0.85rem;
          line-height: 1.4;
        }
        .checkout-price-label {
          color: var(--text-secondary);
          font-weight: 500;
        }
        .checkout-price-value {
          color: var(--text-primary);
          font-weight: 700;
          white-space: nowrap;
        }
        .checkout-price-total-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 0.5rem;
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary);
          padding-top: 0.4rem;
          margin-top: 0.15rem;
          border-top: 1px solid var(--border-light);
        }

        .checkout-item-rx {
          font-size: 0.72rem;
          color: var(--text-muted);
          line-height: 1.5;
          margin: 0;
          overflow-wrap: anywhere;
        }
        .checkout-item-rx strong {
          color: var(--text-secondary);
          font-weight: 700;
        }

        /* Totals */
        .checkout-totals {
          border-top: 1px solid var(--border-light);
          padding-top: 1rem;
          font-size: 0.85rem;
        }
        .checkout-total-row {
          display: flex;
          justify-content: space-between;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }
        .checkout-ship-note {
          font-size: 0.72rem;
          color: var(--text-muted);
          margin-bottom: 0.5rem;
        }
        .checkout-grand-total {
          display: flex;
          justify-content: space-between;
          gap: 0.75rem;
          font-size: 1.15rem;
          font-weight: 700;
          margin-top: 1rem;
          padding-top: 0.75rem;
          border-top: 1px solid var(--border-light);
        }

        .checkout-submit {
          margin-top: 1.75rem;
          padding: 1rem;
        }

        /* === Empty state === */
        .checkout-empty {
          text-align: center;
          padding: 6rem 1.5rem;
        }
        .checkout-empty-title {
          font-family: var(--font-serif);
          font-size: 2rem;
        }
        .checkout-empty-text {
          margin-top: 0.5rem;
          color: var(--text-muted);
        }
        .checkout-empty-btn {
          margin-top: 1.5rem;
        }

        /* === Responsive Breakpoints === */
        @media (max-width: 900px) {
          .checkout-layout {
            grid-template-columns: 1fr;
            gap: 2rem;
          }
        }

        @media (max-width: 640px) {
          .checkout-page {
            padding: 2rem 1rem;
          }
          .checkout-title {
            font-size: 1.6rem;
          }
          .checkout-header {
            margin-bottom: 1.75rem;
          }
          .checkout-section-title {
            font-size: 1.15rem;
          }
          .checkout-section-title--spaced {
            margin: 2rem 0 1.25rem 0;
          }
          .checkout-row--2,
          .checkout-row--3 {
            grid-template-columns: 1fr;
          }
          .checkout-summary {
            padding: 1.25rem;
          }
          .checkout-grand-total {
            font-size: 1rem;
          }
          .checkout-empty {
            padding: 4rem 1rem;
          }
          .checkout-empty-title {
            font-size: 1.5rem;
          }
          .checkout-cod-box {
            padding: 1rem;
          }
        }

        @media (max-width: 400px) {
          .checkout-title {
            font-size: 1.4rem;
          }
          .checkout-item-img {
            width: 48px;
            height: 60px;
          }
          .checkout-item-name {
            font-size: 0.82rem;
          }
          .checkout-price-row {
            font-size: 0.78rem;
          }
          .checkout-price-total-row {
            font-size: 0.92rem;
          }
        }
      `}</style>
    </div>
  );
}