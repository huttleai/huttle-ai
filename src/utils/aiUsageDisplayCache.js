/**
 * Local display cache for the monthly AI credit pool.
 *
 * The system of record is server-written `user_activity` rows
 * (`feature = 'aiGenerations'`). This cache is only for instant UI feedback
 * and must never be used to authorize a generation.
 */

export const AI_USAGE_DISPLAY_CACHE_KEY = 'aiGensUsed';

export function readAiUsageDisplayCache() {
  try {
    const raw = localStorage.getItem(AI_USAGE_DISPLAY_CACHE_KEY);
    const used = parseInt(raw, 10);
    return Number.isFinite(used) && used >= 0 ? used : 0;
  } catch {
    return 0;
  }
}

export function writeAiUsageDisplayCache(count) {
  if (!Number.isFinite(count) || count < 0) return;
  try {
    localStorage.setItem(AI_USAGE_DISPLAY_CACHE_KEY, String(Math.floor(count)));
  } catch {
    // Display-only; ignore quota / private-mode failures.
  }
}

/**
 * Optimistic UI bump after a successful proxy response. Server billing is
 * authoritative; pages should follow this with refreshUsage() when possible.
 * @param {number} [credits=1]
 * @returns {number} updated display count
 */
export function bumpAiUsageDisplayCache(credits = 1) {
  const add = Math.max(0, Math.floor(Number(credits) || 0));
  const next = readAiUsageDisplayCache() + add;
  writeAiUsageDisplayCache(next);
  return next;
}

export function syncAiUsageDisplayCacheFromServer(count) {
  if (!Number.isFinite(count) || count < 0) return;
  writeAiUsageDisplayCache(count);
}
