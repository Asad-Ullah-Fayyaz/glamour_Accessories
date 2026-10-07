import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEvent, META_EVENTS } from '../../services/metaPixel';

/**
 * Fires a Meta Pixel "PageView" event on route changes.
 *
 * The FIRST PageView is fired by the base snippet in index.html when the
 * browser loads the app for the first time. This component handles every
 * navigation AFTER that (clicking a link, back/forward, etc.).
 *
 * Admin routes (/admin/*) are skipped so internal traffic doesn't pollute
 * Meta's audience data and skew retargeting / lookalikes.
 */
export default function MetaPixelTracker() {
  const location = useLocation();
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip the very first render because index.html already fired PageView
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Never track admin pages
    if (location.pathname.startsWith('/admin')) return;

    trackEvent(META_EVENTS.PAGE_VIEW);
  }, [location.pathname, location.search]);

  return null;
}