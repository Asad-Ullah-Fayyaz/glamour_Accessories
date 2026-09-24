import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  // 1) Force scroll to top on EVERY route change (path + query)
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname, search]);

  // 2) Force scroll to top on the very first mount / page load.
  //    useLayoutEffect runs BEFORE the browser paints, so the user never
  //    sees a flash of the wrong scroll position.
  useLayoutEffect(() => {
    if ('scrollRestoration' in window.history) {
      // Don't let the browser restore the previous scroll position.
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  return null;
}