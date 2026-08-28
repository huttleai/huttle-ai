/**
 * CORS Utility for Serverless Functions
 *
 * SECURITY: Restricts CORS to allowed origins only.
 * Prevents cross-origin attacks from malicious websites.
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

// Allowed origins - production-safe list with localhost only in development
export const ALLOWED_ORIGINS = [
  process.env.APP_URL,
  process.env.VITE_APP_URL,
  process.env.NEXT_PUBLIC_APP_URL,
  'https://huttleai.com',
  'https://www.huttleai.com',
  'https://huttle-ai.vercel.app',
  ...(isDevelopment
    ? ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173']
    : []),
].filter(Boolean);

/**
 * Named server-to-server callers that send no Origin header.
 * These are not browser CORS requests. Do not treat missing Origin as an
 * allowed browser origin; identify them by an explicit signal instead.
 */
export const TRUSTED_NO_ORIGIN_CALLERS = {
  STRIPE_WEBHOOK: 'stripe-webhook',
  VERCEL_CRON: 'vercel-cron',
};

/**
 * Identify a named no-Origin server-to-server caller, or null.
 * Used so missing Origin is never a blanket allow for browser CORS.
 *
 * @param {Object} req
 * @returns {string|null}
 */
export function identifyTrustedNoOriginCaller(req) {
  const headers = req?.headers || {};
  if (headers.origin) return null;

  if (typeof headers['stripe-signature'] === 'string' && headers['stripe-signature']) {
    return TRUSTED_NO_ORIGIN_CALLERS.STRIPE_WEBHOOK;
  }

  const cron = headers['x-vercel-cron'];
  if (cron === '1' || cron === 'true') {
    return TRUSTED_NO_ORIGIN_CALLERS.VERCEL_CRON;
  }

  return null;
}

/**
 * Set secure CORS headers on the response
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {boolean} - True if the browser Origin is on the allowlist
 */
export function setCorsHeaders(req, res) {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  // Missing Origin is not a browser CORS request. Do not echo '*' and do not
  // treat it as allowed. Named server-to-server callers (Stripe webhooks via
  // stripe-signature, Vercel Cron via x-vercel-cron) skip this allowlist.
  // Disallowed origins get no Access-Control-Allow-Origin header so the
  // browser blocks the response.

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-grok-debug'
  );
  res.setHeader('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
  res.setHeader('Vary', 'Origin');

  return Boolean(origin && ALLOWED_ORIGINS.includes(origin));
}

/**
 * Handle OPTIONS preflight requests
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {boolean} - True if this was a preflight request that was handled
 */
export function handlePreflight(req, res) {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(req, res);
    res.status(200).end();
    return true;
  }
  return false;
}

/**
 * Verify the request Origin is on the browser allowlist.
 * Missing Origin is not allowed here — use identifyTrustedNoOriginCaller()
 * for named server-to-server exceptions.
 *
 * @param {Object} req - Request object
 * @returns {boolean} - True if origin is allowed
 */
export function isOriginAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

export default { setCorsHeaders, handlePreflight, isOriginAllowed, ALLOWED_ORIGINS, identifyTrustedNoOriginCaller, TRUSTED_NO_ORIGIN_CALLERS };
