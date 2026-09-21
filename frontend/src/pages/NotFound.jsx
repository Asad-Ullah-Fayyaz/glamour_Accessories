import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container notfound-page">
      <span className="notfound-eyebrow">404 — PAGE NOT FOUND</span>
      <h1 className="notfound-title">Destination Unavailable</h1>
      <p className="notfound-text">
        The page or collection reference you are searching for does not exist or has been
        relocated.
      </p>
      <div className="notfound-actions">
        <Link to="/" className="btn btn-primary">
          Return to Home
        </Link>
        <Link to="/products" className="btn btn-secondary">
          Browse Catalog
        </Link>
      </div>

      <style>{`
        .notfound-page {
          padding: 8rem 1.5rem;
          max-width: 560px;
          text-align: center;
        }
        .notfound-eyebrow {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          color: var(--accent-gold);
        }
        .notfound-title {
          font-family: var(--font-serif);
          font-size: 2.5rem;
          margin-top: 0.5rem;
          color: var(--text-primary);
          line-height: 1.2;
        }
        .notfound-text {
          color: var(--text-secondary);
          margin-top: 1rem;
          font-size: 0.95rem;
          line-height: 1.7;
        }
        .notfound-actions {
          margin-top: 2.5rem;
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        @media (max-width: 640px) {
          .notfound-page {
            padding: 4rem 1rem;
          }
          .notfound-title {
            font-size: 1.75rem;
          }
          .notfound-text {
            font-size: 0.9rem;
          }
          .notfound-actions {
            margin-top: 2rem;
            flex-direction: column;
            align-items: stretch;
          }
          .notfound-actions .btn {
            width: 100%;
            text-align: center;
            justify-content: center;
          }
        }

        @media (max-width: 360px) {
          .notfound-page {
            padding: 3rem 0.75rem;
          }
          .notfound-title {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}