import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEvent, META_EVENTS } from '../../services/metaPixel';

/**
 * Fires a Meta Pixel "PageView" event on every route change.
 *
 * The FIRST PageView is fired by the base snippet in index.html when the
 * browser loads the app for the first time. This component handles every
 * navigation AFTER that (clicking a link, back/forward, etc.).
 *
 * Admin routes (/admin/*) are skipped so internal traffic doesn't pollute
 * Meta's audience data and skew retargeting / lookalikes.
 *
 * Place it inside <Router> so useLocation() is available.
 */
export default function MetaPixelTracker() {
  const location = useLocation();

  useEffect(() => {
    // Never track admin pages — they would pollute Meta's audience data
    // with internal traffic.
    if (location.pathname.startsWith('/admin')) return;

    trackEvent(META_EVENTS.PAGE_VIEW);
  }, [location.pathname, location.search]);

  return null;
}