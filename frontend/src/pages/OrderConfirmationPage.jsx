import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useLocation } from 'react-router-dom';
import { CheckCircle, Truck, Package, ArrowRight } from 'lucide-react';
import api from '../services/api';
import { trackEvent, META_EVENTS } from '../services/metaPixel';

export default function OrderConfirmationPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const orderId = searchParams.get('orderId');

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }

      // 1) Prefer the order passed via navigation state from checkout.
      //    This works for guests (no auth required) and avoids an extra API call.
      const stateOrder =
        location.state && location.state.order && location.state.order.orderId === orderId
          ? location.state.order
          : null;

      if (stateOrder) {
        setOrder(stateOrder);
        firePurchasePixel(stateOrder);
        setLoading(false);
        return;
      }

      // 2) Fall back to the private endpoint (works for logged-in owners).
      try {
        const res = await api.get(`/orders/${orderId}`);
        if (res.success && res.order) {
          setOrder(res.order);
          firePurchasePixel(res.order);
        }
      } catch (err) {
        // 3) Last resort: public track endpoint using phone from sessionStorage.
        //    Checkout stores the phone number under `last_order_phone` so the
        //    confirmation page can retrieve the order without auth.
        try {
          const savedPhone =
            typeof window !== 'undefined'
              ? sessionStorage.getItem('last_order_phone') || ''
              : '';

          const trackRes = await api.post('/orders/track', {
            orderId,
            emailOrPhone: savedPhone || undefined
          });

          if (trackRes.success && trackRes.tracking) {
            // track() returns a lighter payload; still enough for the UI.
            setOrder({
              orderId: trackRes.tracking.orderId,
              status: trackRes.tracking.status,
              createdAt: trackRes.tracking.createdAt,
              totalAmount: trackRes.tracking.totalAmount,
              paymentMethod: trackRes.tracking.paymentMethod,
              items: [], // not returned by public track
              shippingAddress: { city: trackRes.tracking.cityName }
            });
          }
        } catch (trackErr) {
          // Fallback UI handles missing order gracefully.
        }
      } finally {
        setLoading(false);
      }
    };

    const firePurchasePixel = (ord) => {
      const targetOrderId = ord.orderId || orderId;
      if (!targetOrderId) return;
      const guardKey = `meta_purchase_${targetOrderId}`;
      if (typeof window !== 'undefined' && localStorage.getItem(guardKey)) return;

      const items = Array.isArray(ord.items) ? ord.items : [];
      const totalQty = items.reduce(
        (sum, it) => sum + (Number(it.quantity) || 0),
        0
      );

      trackEvent(
        META_EVENTS.PURCHASE,
        {
          value: Number(ord.totalAmount) || 0,
          currency: 'PKR',
          content_ids: items
            .map((it) => {
              const pid = it.product || it._id;
              return pid ? String(pid) : String(it.name || '');
            })
            .filter(Boolean),
          content_type: 'product',
          num_items: totalQty
        },
        { eventID: targetOrderId }
      );

      if (typeof window !== 'undefined') {
        localStorage.setItem(guardKey, '1');
      }
    };

    fetchOrderDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  if (loading) {
    return (
      <div className="order-confirm-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  // Safe accessors so a missing order never throws.
  const safeItems = Array.isArray(order?.items) ? order.items : [];
  const safeTotal = Number(order?.totalAmount) || 0;

  return (
    <div className="container order-confirm-page">
      <div className="order-confirm-header">
        <CheckCircle size={64} className="order-confirm-icon" />
        <h1 className="order-confirm-title">Order Confirmed</h1>
        <p className="order-confirm-subtitle">
          Thank you for choosing Glamour Accessories. Your Cash on Delivery order has been logged.
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
              <span className="badge badge-dark order-confirm-badge">
                {order?.status || 'Pending'}
              </span>
            </div>
          </div>
        </div>

        {safeItems.length > 0 && (
          <div>
            <h4 className="order-confirm-items-heading">Ordered Items</h4>
            <div className="order-confirm-items">
              {safeItems.map((item, idx) => {
                const lens = item.customization && item.customization.lensOption;
                const lensPrice = lens ? Number(lens.price) || 0 : 0;
                const lineTotal =
                  (item.price || 0) * (item.quantity || 0) +
                  lensPrice * (item.quantity || 0);

                return (
                  <div key={idx} className="order-confirm-item-block">
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
                                  color: '#767676',
                                  fontWeight: 500,
                                  textDecoration: 'line-through',
                                  marginRight: '0.35rem'
                                }}
                              >
                                PKR {Number(item.previousPrice).toLocaleString()}
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
              <span>PKR {safeTotal.toLocaleString()}</span>
            </div>
          </div>
        )}

        {safeItems.length === 0 && (
          <p style={{ fontSize: '0.9rem', color: '#444', margin: 0 }}>
            Your order has been placed successfully. You can track its status using the
            button below.
          </p>
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

        .order-confirm-header {
          text-align: center;
          margin-bottom: 3rem;
        }
        .order-confirm-icon {
          color: #000000;
          margin-bottom: 1rem;
        }
        .order-confirm-title {
          font-family: var(--font-serif);
          font-size: 2.4rem;
          margin-bottom: 0.5rem;
          line-height: 1.2;
          color: #000000;
        }
        .order-confirm-subtitle {
          font-size: 1.05rem;
          color: #444444;
        }

        .order-confirm-card {
          background-color: #F5F5F5;
          border: 1px solid #E0E0E0;
          border-top: 3px solid #000000;
          padding: 2rem;
          margin-bottom: 2.5rem;
        }

        .order-confirm-meta {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
          border-bottom: 1px solid #000000;
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
          color: #767676;
        }
        .order-confirm-ref {
          font-family: var(--font-mono);
          font-size: 1.4rem;
          color: #000000;
          margin-top: 2px;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .order-confirm-value {
          font-size: 1.1rem;
          margin-top: 2px;
          color: #000000;
        }
        .order-confirm-badge {
          margin-top: 4px;
        }

        .order-confirm-items-heading {
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 1rem;
          color: #444444;
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
          border-bottom: 1px solid #E0E0E0;
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
          background-color: #EDEDED;
          border: 1px solid #E0E0E0;
        }
        .order-confirm-item-name {
          font-size: 0.95rem;
          font-weight: 600;
          color: #000000;
          overflow-wrap: anywhere;
          min-width: 0;
        }

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
          color: #444444;
          font-weight: 500;
        }
        .order-confirm-price-value {
          color: #000000;
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
          color: #000000;
          padding-top: 0.4rem;
          margin-top: 0.15rem;
          border-top: 1px solid #000000;
        }
        .order-confirm-rx {
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px dashed #E0E0E0;
          font-size: 0.75rem;
          color: #444444;
          line-height: 1.5;
        }
        .order-confirm-rx strong {
          color: #000000;
          font-weight: 700;
        }
        .order-confirm-rx-link {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          margin-top: 0.35rem;
          font-size: 0.75rem;
          color: #000000;
          text-decoration: underline;
        }
        .order-confirm-rx-link:hover {
          opacity: 0.7;
        }

        .order-confirm-total {
          border-top: 2px solid #000000;
          padding-top: 1rem;
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          font-size: 1.1rem;
          font-weight: 700;
          color: #000000;
        }

        .order-confirm-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }

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