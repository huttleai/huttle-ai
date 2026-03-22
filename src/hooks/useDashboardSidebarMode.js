import { useState, useEffect } from 'react';

/**
 * @returns {'drawer' | 'rail' | 'expanded'}
 * - drawer: &lt; md — overlay sidebar
 * - rail: md–lg — 48px icon rail
 * - expanded: lg+ — full width sidebar
 */
function getMode() {
  if (typeof window === 'undefined') return 'expanded';
  const w = window.innerWidth;
  if (w < 768) return 'drawer';
  if (w < 1024) return 'rail';
  return 'expanded';
}

export function useDashboardSidebarMode() {
  const [mode, setMode] = useState(getMode);

  useEffect(() => {
    const onResize = () => setMode(getMode());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return mode;
}
