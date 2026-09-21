import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Truck, Clock, CheckCircle2, PackageCheck, AlertCircle } from 'lucide-react';
import api from '../services/api';

export default function TrackOrder() {
  const [searchParams] = useSearchParams();
  const initialOrderId = searchParams.get('orderId') || '';

  const [orderId, setOrderId] = useState(initialOrderId);
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialOrderId) {
      handleTrackLookup(initialOrderId);
    }
  }, [initialOrderId]);

  const handleTrackLookup = async (idToSearch) => {
    const targetId = idToSearch || orderId;
    if (!targetId.trim()) {
      setErrorMsg('Please enter your Order Reference ID (e.g. ORD-2026-X89A2)');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setTrackingData(null);

    try {
      const res = await api.post('/orders/track', {
        orderId: targetId,
        emailOrPhone
      });
      if (res.success) {
        setTrackingData(res.tracking);
      }
    } catch (err) {
      setErrorMsg(err.message || 'No active order found matching this reference ID.');
    } finally {
      setLoading(false);
    }
  };

  const getStepActive = (stepName) => {
    if (!trackingData) return false;
    const stages = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered'];
    const currentIdx = stages.indexOf(trackingData.status);
    const stepIdx = stages.indexOf(stepName);
    return stepIdx <= currentIdx && currentIdx !== -1;
  };

  return (
    <div className="container" style={{ padding: '4rem 1.5rem', maxWidth: '840px' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', marginBottom: '0.5rem' }}>
          Track Parcel & Order Status
        </h1>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
          Enter your unique AXI Collection Order Reference ID (e.g. ORD-2026-8F42K) to view real-time courier dispatch updates.
        </p>
      </div>

      {/* Lookup Form */}
      <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem', border: '1px solid var(--border-light)', marginBottom: '3rem' }}>
        <form onSubmit={(e) => { e.preventDefault(); handleTrackLookup(); }} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Order Reference ID *</label>
              <input 
                type="text" 
                placeholder="e.g. ORD-2026-X89A2" 
                value={orderId} 
                onChange={(e) => setOrderId(e.target.value)} 
                required 
                className="form-input"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Email or Phone Number (Optional Verification)</label>
              <input 
                type="text" 
                placeholder="e.g. alexander@example.com" 
                value={emailOrPhone} 
                onChange={(e) => setEmailOrPhone(e.target.value)} 
                className="form-input"
              />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary btn-full">
            {loading ? 'Searching Status...' : 'Track Parcel Now'}
          </button>
        </form>
      </div>

      {errorMsg && (
        <div style={{ backgroundColor: '#fce8e6', color: '#c5221f', padding: '1rem 1.25rem', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <AlertCircle size={20} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tracking Result View */}
      {trackingData && (
        <div style={{ backgroundColor: '#fff', border: '1px solid var(--border-light)', padding: '2.5rem', boxShadow: 'var(--shadow-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Order ID</span>
              <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem' }}>{trackingData.orderId}</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Placed on {new Date(trackingData.createdAt).toLocaleDateString()} &bull; {trackingData.cityName}
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Current Status</span>
              <div><span className="badge badge-dark" style={{ marginTop: '4px', fontSize: '0.85rem' }}>{trackingData.status}</span></div>
            </div>
          </div>

          {/* Status Timeline */}
          <div style={{ margin: '3rem 0' }}>
            <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
              Fulfillment Journey
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
              {['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered'].map((step, idx) => {
                const isActive = getStepActive(step);
                return (
                  <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: isActive ? 'var(--bg-dark)' : 'var(--bg-tertiary)',
                      color: isActive ? '#fff' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      marginBottom: '0.5rem'
                    }}>
                      {isActive ? '✓' : idx + 1}
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: isActive ? 700 : 400, color: isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Courier Details Box */}
          {trackingData.courierInfo && trackingData.courierInfo.trackingId ? (
            <div style={{ backgroundColor: 'var(--bg-secondary)', borderLeft: '4px solid var(--accent-gold)', padding: '1.5rem', marginTop: '2rem' }}>
              <span style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Official Courier Tracking Reference
              </span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{trackingData.courierInfo.carrier || 'Courier Express'}</h4>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.3rem', letterSpacing: '1px', marginTop: '2px' }}>
                    {trackingData.courierInfo.trackingId}
                  </p>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Dispatched on: {trackingData.courierInfo.shippedAt ? new Date(trackingData.courierInfo.shippedAt).toLocaleDateString() : 'In Transit'}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              &bull; Courier tracking ID will appear here as soon as our warehouse team dispatches your package.
            </div>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 600px) {
          form > div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
          div[style*="grid-template-columns: repeat(5"] {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
        }
      `}</style>
    </div>
  );
}
