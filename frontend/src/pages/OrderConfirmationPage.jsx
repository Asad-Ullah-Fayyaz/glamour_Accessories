import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useLocation } from 'react-router-dom';
import {
  CheckCircle,
  Truck,
  Package,
  ArrowRight,
  PackageCheck,
  MessageCircle,
  Headphones,
  Sparkles
} from 'lucide-react';
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
      const stateOrder =
        location.state &&
        location.state.order &&
        location.state.order.orderId === orderId
          ? location.state.order
          : null;

      if (stateOrder) {
        setOrder(stateOrder);
        firePurchasePixel(stateOrder);
        setLoading(false);
        return;
      }

      // 2) Fall back to the private endpoint.
      try {
        const res = await api.get(`/orders/${orderId}`);
        if (res.success && res.order) {
          setOrder(res.order);
          firePurchasePixel(res.order);
        }
      } catch (err) {
        // 3) Last resort: public track endpoint using phone from sessionStorage.
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
            setOrder({
              orderId: trackRes.tracking.orderId,
              status: trackRes.tracking.status,
              createdAt: trackRes.tracking.createdAt,
              totalAmount: trackRes.tracking.totalAmount,
              paymentMethod: trackRes.tracking.paymentMethod,
              items: [],
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
      if (typeof window !== 'undefined' && localStorage.getItem(guardKey))
        return;

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

  // Safe accessors
  const safeItems = Array.isArray(order?.items) ? order.items : [];
  const safeTotal = Number(order?.totalAmount) || 0;

  // Detect if the order contains any customizable / prescription item.
  const hasCustomization = safeItems.some(
    (item) =>
      item.customization &&
      (item.customization.description ||
        item.customization.prescriptionImage ||
        item.customization.lensOption)
  );

  return (
    <div className="container order-confirm-page">
      {/* ============ HEADER ============ */}
      <div className="order-confirm-header">
        <CheckCircle size={64} className="order-confirm-icon" />
        <h1 className="order-confirm-title">Order Confirmed</h1>
        <p className="order-confirm-subtitle">
          Thank you for choosing Glamour Accessories. Your Cash on Delivery
          order has been logged.
        </p>
      </div>

      {/* ============ CUSTOM ORDER NOTICE ============ */}
      {hasCustomization && (
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-start',
            padding: '1rem 1.25rem',
            marginBottom: '2rem',
            backgroundColor: '#FFF8E1',
            border: '1px solid #F5D87D',
            borderLeft: '4px solid #C5A059',
            borderRadius: 'var(--radius-sm)'
          }}
        >
          <Sparkles
            size={18}
            style={{ color: '#C5A059', flexShrink: 0, marginTop: 2 }}
          />
          <div style={{ fontSize: '0.85rem', color: '#5C4308', lineHeight: 1.6 }}>
            <strong style={{ display: 'block', marginBottom: '0.2rem' }}>
              Custom Order Confirmed
            </strong>
            This order contains a customized item. Our team will contact you on{' '}
            <strong>WhatsApp within 24 hours</strong> to confirm your
            prescription details before we begin crafting. Keep your phone
            accessible.
          </div>
        </div>
      )}

      {/* ============ ORDER CARD ============ */}
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
                const lens =
                  item.customization && item.customization.lensOption;
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
                      <span className="order-confirm-item-name">
                        {item.name}
                      </span>
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
                              <strong>
                                PKR {(item.price || 0).toLocaleString()}
                              </strong>
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
                        <span className="order-confirm-price-label">
                          Quantity
                        </span>
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
                              {item.customization.description ||
                                '(image only)'}
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
            Your order has been placed successfully. You can track its status
            using the button below.
          </p>
        )}
      </div>

      {/* ============ NEW: WHAT'S NEXT TIMELINE ============ */}
      <div className="order-confirm-next">
        <h3 className="order-confirm-next-title">What Happens Next</h3>
        <ol className="order-confirm-timeline">
          <TimelineStep
            number={1}
            title="Order Received"
            text="Your order is now in our system. We have your details on file."
            isDone
          />
          <TimelineStep
            number={2}
            title="Confirmation Call"
            text="Our team will call or WhatsApp you to confirm your order and address."
            isActive
          />
          <TimelineStep
            number={3}
            title="Dispatched"
            text="Your parcel is handed to our courier partner. You'll receive a tracking ID by email."
          />
          <TimelineStep
            number={4}
            title="Delivery & Payment"
            text="Inspect your parcel, then pay cash to the courier agent upon delivery."
          />
        </ol>
      </div>

      {/* ============ NEW: SUPPORT BLOCK ============ */}
      <div className="order-confirm-support">
        <div className="order-confirm-support-left">
          <Headphones
            size={22}
            style={{ color: '#000000', flexShrink: 0, marginTop: 2 }}
          />
          <div>
            <strong
              style={{
                display: 'block',
                fontSize: '0.9rem',
                color: '#000000',
                marginBottom: '0.15rem'
              }}
            >
              Need Help With Your Order?
            </strong>
            <span style={{ fontSize: '0.8rem', color: '#444444', lineHeight: 1.5 }}>
              Message us on WhatsApp with your Order Reference — we typically
              reply within a few hours during business hours.
            </span>
          </div>
        </div>
        <Link
          to="/track-order"
          className="btn btn-secondary btn-sm"
          style={{ whiteSpace: 'nowrap' }}
        >
          <MessageCircle size={14} /> Contact Support
        </Link>
      </div>

      {/* ============ ACTIONS ============ */}
      <div className="order-confirm-actions">
        <Link
          to={`/track-order?orderId=${orderId}`}
          className="btn btn-primary"
        >
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
          margin-bottom: 2rem;
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

        /* ============ WHAT'S NEXT TIMELINE ============ */
        .order-confirm-next {
          background-color: #FAFAFA;
          border: 1px solid #E0E0E0;
          padding: 1.75rem;
          margin-bottom: 2rem;
        }
        .order-confirm-next-title {
          font-family: var(--font-serif);
          font-size: 1.15rem;
          font-weight: 400;
          color: #000000;
          margin: 0 0 1.25rem 0;
        }
        .order-confirm-timeline {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        /* ============ SUPPORT BLOCK ============ */
        .order-confirm-support {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
          padding: 1.25rem 1.5rem;
          background-color: #F5F5F5;
          border: 1px solid #E0E0E0;
          border-left: 3px solid #000000;
          margin-bottom: 2rem;
        }
        .order-confirm-support-left {
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
          min-width: 0;
          flex: 1 1 320px;
        }

        .order-confirm-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        /* ============ RESPONSIVE ============ */
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
          .order-confirm-next {
            padding: 1.25rem;
          }
          .order-confirm-support {
            flex-direction: column;
            align-items: stretch;
            padding: 1rem;
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

/* --------------------------------------------------------------------- */
/* Small helper — one step in the "What Happens Next" timeline           */
/* --------------------------------------------------------------------- */
function TimelineStep({ number, title, text, isDone, isActive }) {
  const circleBg = isDone ? '#000000' : isActive ? '#C5A059' : '#FFFFFF';
  const circleColor = isDone || isActive ? '#FFFFFF' : '#767676';
  const circleBorder = isDone || isActive ? 'none' : '1px solid #CCCCCC';
  const titleColor = isDone || isActive ? '#000000' : '#767676';

  return (
    <li style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
      <span
        style={{
          flexShrink: 0,
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: circleBg,
          color: circleColor,
          border: circleBorder,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: '0.85rem',
          lineHeight: 1
        }}
      >
        {isDone ? <PackageCheck size={16} /> : number}
      </span>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: '0.9rem',
            fontWeight: 700,
            color: titleColor,
            marginBottom: '0.2rem'
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: '0.8rem', color: '#767676', lineHeight: 1.55 }}>
          {text}
        </div>
      </div>
    </li>
  );
}