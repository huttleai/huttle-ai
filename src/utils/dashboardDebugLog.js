/**
 * Dashboard/Trending diagnostics print cache keys, niche, feature flags, and
 * payload shapes. Anyone who opens DevTools in production can read those, so
 * they are opt-in: on in dev, or with VITE_DEBUG_DASHBOARD=true.
 */
export const IS_DASHBOARD_DEBUG = Boolean(import.meta.env?.DEV)
  || import.meta.env?.VITE_DEBUG_DASHBOARD === 'true';

export function dashLog(...args) {
  if (IS_DASHBOARD_DEBUG) console.log(...args);
}

export function dashWarn(...args) {
  if (IS_DASHBOARD_DEBUG) console.warn(...args);
}

export function dashError(...args) {
  if (IS_DASHBOARD_DEBUG) console.error(...args);
}
