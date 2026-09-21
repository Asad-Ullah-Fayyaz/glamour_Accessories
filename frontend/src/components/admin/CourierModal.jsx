import React, { useState } from 'react';
import { X, Truck, Send } from 'lucide-react';
import api from '../../services/api';

export default function CourierModal({ order, onClose, onSuccess }) {
  const [carrier, setCarrier] = useState(order?.courierInfo?.carrier || 'Leopards Courier');
  const [trackingId, setTrackingId] = useState(order?.courierInfo?.trackingId || '');
  const [updateStatusToShipped, setUpdateStatusToShipped] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!trackingId.trim()) {
      setErrorMsg('Please enter a valid Courier Tracking ID.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post(`/admin/orders/${order._id}/tracking`, {
        carrier,
        trackingId: trackingId.trim(),
        updateStatusToShipped
      });

      if (res.success) {
        onSuccess(res.message);
        onClose();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to assign courier tracking ID.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: '1rem' }}>
      <div style={{ backgroundColor: '#fff', width: '100%', maxWidth: '500px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', boxShadow: 'var(--shadow-dropdown)' }}>
        <div style={{ padding: '1.25rem 1.5rem', backgroundColor: 'var(--bg-dark)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Truck size={20} style={{ color: 'var(--accent-gold)' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Assign Courier Tracking ID</h3>
          </div>
          <button onClick={onClose} style={{ color: '#fff' }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.85rem', marginBottom: '1.25rem', border: '1px solid var(--border-light)', fontSize: '0.85rem' }}>
            <div><strong>Order Reference:</strong> {order.orderId}</div>
            <div><strong>Customer:</strong> {order.shippingAddress.fullName} ({order.customerEmail})</div>
            <div><strong>Destination:</strong> {order.shippingAddress.city}</div>
          </div>

          {errorMsg && (
            <div style={{ backgroundColor: '#fce8e6', color: '#c5221f', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.8rem' }}>
              {errorMsg}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Courier Carrier Name *</label>
            <select 
              value={carrier} 
              onChange={(e) => setCarrier(e.target.value)} 
              className="form-select"
            >
              <option value="Leopards Courier">Leopards Courier</option>
              <option value="TCS Express">TCS Express</option>
              <option value="M&P Courier">M&P Courier</option>
              <option value="CallCourier">CallCourier</option>
              <option value="Trax Logistics">Trax Logistics</option>
              <option value="Standard Postal Courier">Standard Postal Courier</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Courier Tracking Reference Number *</label>
            <input 
              type="text" 
              value={trackingId} 
              onChange={(e) => setTrackingId(e.target.value)} 
              required 
              className="form-input" 
              placeholder="e.g. LPD-9988223344"
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={updateStatusToShipped} 
                onChange={(e) => setUpdateStatusToShipped(e.target.checked)} 
              />
              Automatically transition order status to <strong>Shipped</strong> and dispatch tracking notification email to customer.
            </label>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary btn-sm">
              {loading ? 'Saving...' : <><Send size={14} /> Save & Send Tracking Email</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
