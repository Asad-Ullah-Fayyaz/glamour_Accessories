import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save } from 'lucide-react';
import api from '../services/api';
import AdminSidebar from '../components/admin/AdminSidebar';

export default function AdminSettings() {
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/site-content/homepage');
        if (res.success) {
          setContent({
            ...res.content,
            store: res.content.store || {}
          });
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const updateStore = (field, value) => {
    setContent((prev) => ({
      ...prev,
      store: { ...prev.store, [field]: value }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const { _id, key, __v, createdAt, updatedAt, ...payload } = content;
      const res = await api.put('/site-content/homepage', payload);
      if (res.success) {
        setContent({ ...res.content, store: res.content.store || {} });
        setMessage('Settings saved ✓');
        setTimeout(() => setMessage(''), 2500);
      }
    } catch (err) {
      setMessage(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '6rem' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!content) return <div style={{ padding: '3rem', textAlign: 'center' }}>Failed to load settings.</div>;

  const store = content.store || {};

  const fee = store.codFee ?? 300;
  const threshold = store.freeShippingThreshold ?? 5000;

  return (
  <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-secondary)' }}>
    <AdminSidebar />
    <main style={{ flex: 1, padding: '2.5rem 1.5rem', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '720px' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '2.5rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {message && (
              <span
                style={{
                  fontSize: '0.8rem',
                  color: message.includes('✓') ? '#137333' : '#C5221F'
                }}
              >
                {message}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        {/* Payment & Shipping Fee */}
        <Section title="Payment & Shipping Fee">
          <ToggleRow
            label="Cash on Delivery (COD)"
            description="Allow customers to pay in cash when their order arrives."
            checked={store.codEnabled !== false}
            onChange={(v) => updateStore('codEnabled', v)}
          />

          <Field label="Fee Below Threshold (PKR)">
            <input
              type="number"
              min="0"
              className="form-input"
              value={store.codFee ?? 300}
              onChange={(e) => updateStore('codFee', Number(e.target.value) || 0)}
            />
            <p
              style={{
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                marginTop: '0.35rem',
                lineHeight: '1.5'
              }}
            >
              Charged on orders below the free-shipping threshold.
            </p>
          </Field>

          <Field label="Free Shipping Threshold (PKR)">
            <input
              type="number"
              min="0"
              className="form-input"
              value={store.freeShippingThreshold ?? 5000}
              onChange={(e) =>
                updateStore('freeShippingThreshold', Number(e.target.value) || 0)
              }
            />
            <p
              style={{
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                marginTop: '0.35rem',
                lineHeight: '1.5'
              }}
            >
              Orders of this amount or more ship free. Below it, the fee above applies.
            </p>
          </Field>

          {/* Live preview */}
          <div
            style={{
              marginTop: '0.5rem',
              padding: '0.85rem 1rem',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              lineHeight: '1.6'
            }}
          >
            <div
              style={{
                fontWeight: 700,
                marginBottom: '0.35rem',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-secondary)'
              }}
            >
              Live Preview
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>
              Order subtotal <strong>PKR {(threshold - 1).toLocaleString()}</strong> → shipping
              charge <strong>PKR {fee.toLocaleString()}</strong>
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>
              Order subtotal <strong>PKR {threshold.toLocaleString()}</strong> or more →{' '}
              <strong style={{ color: '#137333' }}>FREE shipping</strong>
            </div>
          </div>
        </Section>

                    {/* Lens Options */}
      <Section title="Lens Options">
        <p
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            lineHeight: '1.6',
            marginBottom: '0.5rem'
          }}
        >
          These options appear on every product marked as <strong>Customizable</strong>.
          Add, edit, or remove as many as you need. Leave the list empty to hide the
          lens selection entirely.
        </p>

        {(store.lensOptions || []).map((opt, idx) => (
          <div
            key={idx}
            style={{
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-sm)',
              padding: '1rem',
              backgroundColor: 'var(--bg-primary)',
              marginBottom: '1rem',
              position: 'relative'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem'
              }}
            >
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--text-secondary)'
                }}
              >
                Lens {idx + 1}
              </span>
              <button
                type="button"
                onClick={() => {
                  const next = (store.lensOptions || []).filter((_, i) => i !== idx);
                  updateStore('lensOptions', next);
                }}
                style={{
                  fontSize: '0.7rem',
                  color: '#c53030',
                  padding: '0.3rem 0.5rem',
                  border: '1px solid #feb2b2',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  background: 'transparent'
                }}
              >
                Remove
              </button>
            </div>

            <Field label="Name">
              <input
                type="text"
                maxLength={80}
                className="form-input"
                value={opt.name || ''}
                onChange={(e) => {
                  const next = [...(store.lensOptions || [])];
                  next[idx] = { ...next[idx], name: e.target.value };
                  updateStore('lensOptions', next);
                }}
                placeholder="e.g. Photo Sun"
              />
            </Field>

            <Field label="Description">
              <textarea
                rows={2}
                maxLength={500}
                className="form-textarea"
                value={opt.description || ''}
                onChange={(e) => {
                  const next = [...(store.lensOptions || [])];
                  next[idx] = { ...next[idx], description: e.target.value };
                  updateStore('lensOptions', next);
                }}
                placeholder="e.g. Light-adaptive lens that darkens in sunlight."
                style={{ fontSize: '0.85rem' }}
              />
            </Field>

            <Field label="Price (PKR)">
              <input
                type="number"
                min="0"
                step="1"
                className="form-input"
                value={opt.price ?? 0}
                onChange={(e) => {
                  const next = [...(store.lensOptions || [])];
                  next[idx] = {
                    ...next[idx],
                    price: Number(e.target.value) || 0
                  };
                  updateStore('lensOptions', next);
                }}
                placeholder="0"
              />
            </Field>
          </div>
        ))}

        <button
          type="button"
          onClick={() => {
            const next = [...(store.lensOptions || [])];
            if (next.length >= 20) return;
            next.push({ name: '', description: '', price: 0 });
            updateStore('lensOptions', next);
          }}
          disabled={(store.lensOptions || []).length >= 20}
          className="btn btn-secondary"
          style={{
            width: '100%',
            opacity: (store.lensOptions || []).length >= 20 ? 0.5 : 1,
            cursor: (store.lensOptions || []).length >= 20 ? 'not-allowed' : 'pointer'
          }}
        >
          + Add Lens Option
          {(store.lensOptions || []).length >= 20 && ' (max 20)'}
        </button>
      </Section>

      </div>
    </main>
    </div>
  );
}

/* --- Layout helpers --- */

function Section({ title, children }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-sm)',
        padding: '1.75rem',
        marginBottom: '1.5rem'
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '1.25rem',
          marginBottom: '1.25rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid var(--border-light)'
        }}
      >
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: '0.7rem',
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
          marginBottom: '0.35rem'
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '1rem',
        padding: '0.75rem 0',
        borderBottom: '1px solid var(--border-light)'
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{label}</div>
        {description && (
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              marginTop: '0.2rem'
            }}
          >
            {description}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        style={{
          width: '46px',
          height: '26px',
          borderRadius: '999px',
          backgroundColor: checked ? '#111' : '#ccc',
          position: 'relative',
          transition: 'background-color 0.2s',
          flexShrink: 0,
          cursor: 'pointer',
          border: 'none'
        }}
        aria-pressed={checked}
      >
        <span
          style={{
            position: 'absolute',
            top: '3px',
            left: checked ? '23px' : '3px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: '#fff',
            transition: 'left 0.2s'
          }}
        />
      </button>
    </div>
  );
}