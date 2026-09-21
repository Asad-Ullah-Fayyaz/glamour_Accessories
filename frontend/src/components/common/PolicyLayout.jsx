import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PolicyLayout({ title, subtitle, lastUpdated, children }) {
  const navigate = useNavigate();

  return (
    <div className="container" style={{ padding: '3rem 1.5rem', maxWidth: '860px' }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          marginBottom: '1.5rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em'
        }}
      >
        <ArrowLeft size={14} /> Back
      </button>

      <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '1.5rem', marginBottom: '2.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', fontWeight: 400, marginBottom: '0.5rem' }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.7', maxWidth: '640px' }}>
            {subtitle}
          </p>
        )}
        {lastUpdated && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Last updated: {lastUpdated}
          </p>
        )}
      </div>

      <div
        className="policy-content"
        style={{
          fontSize: '0.9rem',
          color: 'var(--text-secondary)',
          lineHeight: '1.8'
        }}
      >
        {children}
      </div>

      <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--border-light)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Questions about this policy? Contact us on WhatsApp or reach out through our support channels.
        <div style={{ marginTop: '0.75rem' }}>
          <Link to="/products" style={{ color: 'var(--text-primary)', textDecoration: 'underline' }}>
            Return to Shop →
          </Link>
        </div>
      </div>

      <style>{`
        .policy-content h2 {
          font-family: var(--font-serif);
          font-size: 1.35rem;
          color: var(--text-primary);
          font-weight: 400;
          margin: 2rem 0 0.75rem 0;
        }
        .policy-content h3 {
          font-size: 0.95rem;
          color: var(--text-primary);
          font-weight: 700;
          margin: 1.5rem 0 0.5rem 0;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .policy-content p {
          margin-bottom: 1rem;
        }
        .policy-content ul {
          margin: 0.5rem 0 1.25rem 0;
          padding-left: 1.25rem;
        }
        .policy-content li {
          margin-bottom: 0.5rem;
        }
        .policy-content strong {
          color: var(--text-primary);
        }
        .policy-content a {
          color: var(--text-primary);
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}