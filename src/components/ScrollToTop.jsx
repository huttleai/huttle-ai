import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * React Router does not scroll the window on navigation. Preserved scroll from the
 * previous page leaves long dashboard views (e.g. Brand Profile) scrolled mid-page.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}
