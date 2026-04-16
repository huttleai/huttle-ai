import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPixelEvent } from '../utils/metaPixel';

/**
 * Fires a Meta Pixel `PageView` event on every client-side route change.
 *
 * The base Pixel code in `index.html` already fires the initial PageView on
 * hard page load, so we skip the first effect run to avoid double-counting.
 * Mount this once inside `<BrowserRouter>`.
 */
export default function MetaPixelRouteTracker() {
  const location = useLocation();
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    trackPixelEvent('PageView');
  }, [location.pathname, location.search]);

  return null;
}
