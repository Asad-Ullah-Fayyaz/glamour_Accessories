import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  initializeMetaPixel,
  isMetaPixelInitialized,
  trackEvent,
  META_EVENTS
} from '../../services/metaPixel';
import {
  hasMetaTrackingConsent,
  shouldTrackPageView
} from '../../services/metaTracking';

/**
 * Fires a Meta Pixel "PageView" event on route changes.
 *
 * The first PageView is fired by this component after advertising consent;
 * it also handles later SPA navigation.
 *
 * Admin routes (/admin/*) are skipped so internal traffic doesn't pollute
 * Meta's audience data and skew retargeting / lookalikes.
 */
export default function MetaPixelTracker() {
  const location = useLocation();
  const lastTrackedLocation = useRef(null);

  useEffect(() => {
    const trackCurrentLocation = () => {
      const currentLocation = `${location.pathname}${location.search}`;
      const previousLocation = lastTrackedLocation.current;
      lastTrackedLocation.current = currentLocation;

      if (!shouldTrackPageView(location.pathname) || !hasMetaTrackingConsent()) return;

      if (!isMetaPixelInitialized()) {
        initializeMetaPixel();
        return;
      }

      if (previousLocation !== null && previousLocation !== currentLocation) {
        trackEvent(META_EVENTS.PAGE_VIEW);
      }
    };

    trackCurrentLocation();
    window.addEventListener('meta-tracking-consent-change', trackCurrentLocation);
    return () => {
      window.removeEventListener('meta-tracking-consent-change', trackCurrentLocation);
    };
  }, [location.pathname, location.search]);

  return null;
}