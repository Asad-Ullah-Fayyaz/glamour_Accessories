import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Truck, Package, ArrowRight } from 'lucide-react';
import api from '../services/api';

export default function OrderConfirmationPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get(`/orders/${orderId}`);
        if (res.success) {
          setOrder(res.order);
        }
      } catch (err) {
        // Fallback UI handles missing order gracefully
      } finally {
        setLoading(false);
      }
    };
    fetchOrderDetails();
  }, [orderId]);

  if (loading) {
    return (
      <div className="order-confirm-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="container order-confirm-page">
      <div className="order-confirm-header">
        <CheckCircle size={64} className="order-confirm-icon" />
        <h1 className="order-confirm-title">Order Confirmed</h1>
        <p className="order-confirm-subtitle">
          Thank you for choosing AXI Collection. Your Cash on Delivery order has been logged.
        </p>
      </div>

      <div className="order-confirm-card">
        <div className="order-confirm-meta">
          <div className="order-confirm-meta-item">
            <span className="order-confirm-label">Order Reference</span>
            <h3 className="order-confirm-ref">{orderId || 'ORD-2026-X89A2'}</h3>
          </div>
          <div className="order-confirm-meta-item">
            <span className="order-confirm-label">Payment Mode</span>
            <h4 className="order-confirm-value">Cash on Delivery</h4>
          </div>
          <div className="order-confirm-meta-item">
            <span className="order-confirm-label">Status</span>
            <div>
              <span className="badge badge-warning order-confirm-badge">
                {order?.status || 'Pending'}
              </span>
            </div>
          </div>
        </div>

        {order && (
          <div>
            <h4 className="order-confirm-items-heading">Ordered Items</h4>
            <div className="order-confirm-items">
              {order.items.map((item, idx) => {
                const lens = item.customization && item.customization.lensOption;
                const lensPrice = lens ? Number(lens.price) || 0 : 0;
                const lineTotal =
                  (item.price || 0) * (item.quantity || 0) +
                  lensPrice * (item.quantity || 0);

                return (
                  <div key={idx} className="order-confirm-item-block">
                    {/* Top: thumbnail + name */}
                    <div className="order-confirm-item-top">
                      <img
                        src={
                          item.image ||
                          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1000&auto=format&fit=crop'
                        }
                        alt={item.name}
                        className="order-confirm-item-img"
                      />
                      <span className="order-confirm-item-name">{item.name}</span>
                    </div>

                    {/* Breakdown */}
                    <div className="order-confirm-item-breakdown">
                      <div className="order-confirm-price-row">
                        <span className="order-confirm-price-label">
                          {lens ? 'Frame' : 'Price'}
                        </span>
                        <span className="order-confirm-price-value">
                          {item.previousPrice ? (
                            <>
                              <span
                                style={{
                                  color: 'var(--text-muted)',
                                  fontWeight: 500,
                                  textDecoration: 'line-through',
                                  marginRight: '0.35rem'
                                }}
                              >
                                PKR {item.previousPrice.toLocaleString()}
                              </span>
                              <strong>PKR {(item.price || 0).toLocaleString()}</strong>
                            </>
                          ) : (
                            `PKR ${(item.price || 0).toLocaleString()}`
                          )}
                        </span>
                      </div>

                      {lens && (
                        <div className="order-confirm-price-row">
                          <span className="order-confirm-price-label">
                            Lens ({lens.name})
                          </span>
                          <span className="order-confirm-price-value">
                            {lensPrice > 0
                              ? `+PKR ${lensPrice.toLocaleString()}`
                              : 'Free'}
                          </span>
                        </div>
                      )}

                      <div className="order-confirm-price-row">
                        <span className="order-confirm-price-label">Quantity</span>
                        <span className="order-confirm-price-value">
                          {item.quantity}
                        </span>
                      </div>

                      <div className="order-confirm-price-total-row">
                        <span>Total</span>
                        <span>PKR {lineTotal.toLocaleString()}</span>
                      </div>

                      {/* Rx line */}
                      {item.customization &&
                        (item.customization.description ||
                          item.customization.prescriptionImage) && (
                          <div className="order-confirm-rx">
                            <div>
                              <strong>Rx:</strong>{' '}
                              {item.customization.description || '(image only)'}
                            </div>
                            {item.customization.prescriptionImage && (
                              <a
                                href={item.customization.prescriptionImage}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="order-confirm-rx-link"
                              >
                                📎 View prescription image
                              </a>
                            )}
                          </div>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="order-confirm-total">
              <span>Total Payable upon Delivery</span>
              <span>PKR {order.totalAmount.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      <div className="order-confirm-actions">
        <Link to={`/track-order?orderId=${orderId}`} className="btn btn-primary">
          Track Order Status <ArrowRight size={16} />
        </Link>
        <Link to="/products" className="btn btn-secondary">
          Continue Shopping
        </Link>
      </div>

      <style>{`
        .order-confirm-page {
          padding: 4rem 1.5rem;
          max-width: 800px;
        }

        .order-confirm-loading {
          display: flex;
          justify-content: center;
          padding: 8rem 1.5rem;
        }

        /* Header */
        .order-confirm-header {
          text-align: center;
          margin-bottom: 3rem;
        }
        .order-confirm-icon {
          color: #137333;
          margin-bottom: 1rem;
        }
        .order-confirm-title {
          font-family: var(--font-serif);
          font-size: 2.4rem;
          margin-bottom: 0.5rem;
          line-height: 1.2;
        }
        .order-confirm-subtitle {
          font-size: 1.05rem;
          color: var(--text-secondary);
        }

        /* Card */
        .order-confirm-card {
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-light);
          padding: 2rem;
          margin-bottom: 2.5rem;
        }

        /* Meta row */
        .order-confirm-meta {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
          border-bottom: 1px solid var(--border-light);
          padding-bottom: 1rem;
          margin-bottom: 1.5rem;
        }
        .order-confirm-meta-item {
          min-width: 0;
        }
        .order-confirm-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-muted);
        }
        .order-confirm-ref {
          font-family: var(--font-mono);
          font-size: 1.4rem;
          color: var(--text-primary);
          margin-top: 2px;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .order-confirm-value {
          font-size: 1.1rem;
          margin-top: 2px;
        }
        .order-confirm-badge {
          margin-top: 4px;
        }

        /* Items */
        .order-confirm-items-heading {
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 1rem;
          color: var(--text-secondary);
        }
        .order-confirm-items {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }
        .order-confirm-item-block {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border-light);
        }
        .order-confirm-item-block:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
        .order-confirm-item-top {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          min-width: 0;
        }
        .order-confirm-item-img {
          width: 48px;
          height: 60px;
          object-fit: cover;
          flex-shrink: 0;
          border-radius: var(--radius-sm);
          background-color: var(--bg-tertiary);
        }
        .order-confirm-item-name {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-primary);
          overflow-wrap: anywhere;
          min-width: 0;
        }

        /* Breakdown */
        .order-confirm-item-breakdown {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .order-confirm-price-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 0.5rem;
          font-size: 0.85rem;
          line-height: 1.4;
        }
        .order-confirm-price-label {
          color: var(--text-secondary);
          font-weight: 500;
        }
        .order-confirm-price-value {
          color: var(--text-primary);
          font-weight: 700;
          white-space: nowrap;
        }
        .order-confirm-price-total-row {
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
        .order-confirm-rx {
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px dashed var(--border-light);
          font-size: 0.75rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }
        .order-confirm-rx strong {
          color: var(--text-primary);
          font-weight: 700;
        }
        .order-confirm-rx-link {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          margin-top: 0.35rem;
          font-size: 0.75rem;
          color: var(--accent-gold);
          text-decoration: underline;
        }

        /* Total */
        .order-confirm-total {
          border-top: 1px solid var(--border-light);
          padding-top: 1rem;
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          font-size: 1.1rem;
          font-weight: 700;
        }

        /* Actions */
        .order-confirm-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        /* === Responsive === */
        @media (max-width: 640px) {
          .order-confirm-page {
            padding: 2.5rem 1rem;
          }
          .order-confirm-loading {
            padding: 5rem 1rem;
          }
          .order-confirm-header {
            margin-bottom: 2rem;
          }
          .order-confirm-title {
            font-size: 1.75rem;
          }
          .order-confirm-subtitle {
            font-size: 0.95rem;
          }
          .order-confirm-card {
            padding: 1.25rem;
            margin-bottom: 1.75rem;
          }
          .order-confirm-meta {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
          .order-confirm-ref {
            font-size: 1.15rem;
          }
          .order-confirm-value {
            font-size: 1rem;
          }
          .order-confirm-price-row {
            font-size: 0.8rem;
          }
          .order-confirm-price-total-row {
            font-size: 0.95rem;
          }
          .order-confirm-total {
            flex-direction: column;
            align-items: flex-start;
            font-size: 1rem;
            gap: 0.35rem;
          }
          .order-confirm-actions {
            flex-direction: column;
            align-items: stretch;
          }
          .order-confirm-actions .btn {
            width: 100%;
            text-align: center;
            justify-content: center;
          }
        }

        @media (max-width: 360px) {
          .order-confirm-title {
            font-size: 1.5rem;
          }
          .order-confirm-icon {
            width: 48px;
            height: 48px;
          }
          .order-confirm-card {
            padding: 1rem;
          }
          .order-confirm-item-img {
            width: 40px;
            height: 50px;
          }
          .order-confirm-item-name {
            font-size: 0.88rem;
          }
        }
      `}</style>
    </div>
  );
}