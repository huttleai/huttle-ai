/**
 * CORS Utility for Serverless Functions
 * 
 * SECURITY: Restricts CORS to allowed origins only
 * Prevents cross-origin attacks from malicious websites
 */

// Allowed origins - add your production domains here
const ALLOWED_ORIGINS = [
  process.env.VITE_APP_URL,
  process.env.NEXT_PUBLIC_APP_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
].filter(Boolean); // Remove undefined values

/**
 * Set secure CORS headers on the response
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {boolean} - True if origin is allowed, false otherwise
 */
export function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  
  // Check if origin is in allowed list
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // Allow requests with no origin (like mobile apps, Postman, or server-to-server)
    // but don't set the header - browser will handle it
  }
  // If origin is not allowed, don't set Access-Control-Allow-Origin
  // This will cause the browser to block the request
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
  
  return true;
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
 * Verify the request origin is allowed
 * @param {Object} req - Request object
 * @returns {boolean} - True if origin is allowed
 */
export function isOriginAllowed(req) {
  const origin = req.headers.origin;
  // Allow requests with no origin (server-to-server, mobile apps)
  if (!origin) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

export default { setCorsHeaders, handlePreflight, isOriginAllowed, ALLOWED_ORIGINS };
