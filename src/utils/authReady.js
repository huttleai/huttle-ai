import { supabase } from '../config/supabase';

/**
 * Shared fail-closed auth token helper.
 *
 * Rule: no fetch to AI proxies or user-scoped billing endpoints may fire without
 * a real Bearer token in hand. getSession → refreshSession (with short backoff on
 * transient network failure only) → typed AUTH_NOT_READY error when still no token.
 */

export const AUTH_NOT_READY = 'AUTH_NOT_READY';

/** Backoff delays for token refresh on transient network failure (not auth errors). */
const REFRESH_RETRY_DELAYS_MS = [1000, 2000];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isAuthNotReadyError(error) {
  return error?.code === AUTH_NOT_READY;
}

export function createAuthNotReadyError(message = 'Auth session is not ready yet.') {
  const error = new Error(message);
  error.code = AUTH_NOT_READY;
  return error;
}

/** Fetch/network-shaped failures that are worth retrying; auth errors are not. */
export function isTransientNetworkError(error) {
  if (!error) return false;
  if (error.name === 'AbortError') return false;
  const message = String(error.message || '').toLowerCase();
  return (
    error.name === 'TypeError'
    || message.includes('failed to fetch')
    || message.includes('networkerror')
    || message.includes('network request failed')
    || message.includes('load failed')
    || message.includes('timed out')
    || message.includes('timeout')
    || message.includes('fetch failed')
    || message.includes('socket')
    || message.includes('econn')
  );
}

/**
 * Refresh the Supabase session, retrying with backoff only on transient network
 * failure. Auth failures (invalid refresh token etc.) return immediately.
 * @returns {Promise<{ session: object|null, reason: 'ok'|'auth'|'network' }>}
 */
export async function refreshSessionWithBackoff() {
  for (let attempt = 0; attempt <= REFRESH_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (data?.session?.access_token) {
        return { session: data.session, reason: 'ok' };
      }
      if (error && !isTransientNetworkError(error)) {
        return { session: null, reason: 'auth' };
      }
      if (!error) {
        // No session and no error means there is nothing to refresh (signed out).
        return { session: null, reason: 'auth' };
      }
    } catch (error) {
      if (!isTransientNetworkError(error)) {
        return { session: null, reason: 'auth' };
      }
    }

    if (attempt < REFRESH_RETRY_DELAYS_MS.length) {
      await sleep(REFRESH_RETRY_DELAYS_MS[attempt]);
    }
  }

  return { session: null, reason: 'network' };
}

/**
 * Resolve a usable access token or throw a typed AUTH_NOT_READY error.
 * @param {{ forceRefresh?: boolean }} [options]
 * @returns {Promise<string>}
 */
export async function getConfirmedAccessToken({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        return data.session.access_token;
      }
    } catch {
      // Fall through to a refresh attempt below.
    }
  }

  const { session } = await refreshSessionWithBackoff();
  if (session?.access_token) {
    return session.access_token;
  }

  throw createAuthNotReadyError();
}

/**
 * Build request headers with a guaranteed Bearer token (fail closed).
 * Throws AUTH_NOT_READY instead of returning headers without Authorization.
 * @param {{ forceRefresh?: boolean }} [options]
 * @returns {Promise<Record<string, string>>}
 */
export async function getAuthReadyHeaders(options = {}) {
  const accessToken = await getConfirmedAccessToken(options);
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}
