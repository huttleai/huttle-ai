/**
 * Meta Pixel helper.
 *
 * The base Pixel script is loaded in `index.html` and exposes `window.fbq`.
 * These helpers fire standard events safely (no-op if the Pixel hasn't
 * loaded, e.g. blocked by an ad blocker or during SSR) and log to the
 * console in development so we can verify events as they fire.
 */

const isDev = import.meta.env.DEV;

/**
 * Fire a Meta Pixel standard event.
 * @param {string} eventName - e.g. 'PageView', 'InitiateCheckout', 'Purchase'
 * @param {Record<string, unknown>} [params] - Optional event params (value, currency, content_name, etc.)
 */
export function trackPixelEvent(eventName, params) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;

  try {
    if (params && Object.keys(params).length > 0) {
      window.fbq('track', eventName, params);
    } else {
      window.fbq('track', eventName);
    }

    if (isDev) {
      // eslint-disable-next-line no-console
      console.log(`[MetaPixel] ${eventName}`, params ?? {});
    }
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.warn('[MetaPixel] Failed to fire event:', eventName, error);
    }
  }
}
