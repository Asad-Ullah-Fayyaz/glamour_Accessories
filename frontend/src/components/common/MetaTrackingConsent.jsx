import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  getMetaTrackingConsent
} from '../../services/metaTracking';
import {
  disableMetaPixelTracking,
  setMetaTrackingConsent,
  verifyMetaTrackingConsent
} from '../../services/metaPixel';

export default function MetaTrackingConsent() {
  const location = useLocation();
  const [consent, setConsent] = useState(() => getMetaTrackingConsent());
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    verifyMetaTrackingConsent().then(() => {
      setConsent(getMetaTrackingConsent());
    });

    const syncConsent = () => {
      setConsent(getMetaTrackingConsent());
    };
    const syncOtherTabConsent = (event) => {
      if (
        event.key === 'glamour_meta_tracking_consent' &&
        event.newValue === 'denied'
      ) {
        disableMetaPixelTracking();
        window.dispatchEvent(new window.Event('meta-tracking-consent-change'));
        return;
      }
      verifyMetaTrackingConsent().then(syncConsent);
    };

    window.addEventListener('meta-tracking-consent-change', syncConsent);
    window.addEventListener('storage', syncOtherTabConsent);
    return () => {
      window.removeEventListener('meta-tracking-consent-change', syncConsent);
      window.removeEventListener('storage', syncOtherTabConsent);
    };
  }, []);

  if (consent !== null || location.pathname.startsWith('/admin')) return null;

  const chooseConsent = async (value) => {
    if (!(await setMetaTrackingConsent(value))) {
      setSaveError('Your choice could not be saved. Advertising tracking remains off.');
      setConsent(getMetaTrackingConsent());
      return;
    }

    setSaveError('');
    setConsent(value);
  };

  return (
    <aside
      role="region"
      aria-label="Advertising tracking preferences"
      style={{
        position: 'fixed',
        zIndex: 10000,
        right: '1rem',
        bottom: '1rem',
        width: 'min(28rem, calc(100vw - 2rem))',
        padding: '1.25rem',
        background: '#fff',
        color: '#000',
        border: '1px solid #000',
        boxShadow: 'var(--shadow-dropdown)'
      }}
    >
      <h2 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
        Advertising tracking preferences
      </h2>
      <p style={{ fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '1rem' }}>
        Allow Meta Pixel and server-side advertising measurement, including
        relevant browsing and order events. You can decline and still use the
        store normally. See our Privacy Policy for details.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => chooseConsent('granted')}
        >
          Allow advertising tracking
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => chooseConsent('denied')}
        >
          Decline
        </button>
      </div>
      {saveError && (
        <p role="alert" style={{ color: '#a00', fontSize: '0.8rem', marginTop: '0.75rem' }}>
          {saveError}
        </p>
      )}
    </aside>
  );
}
