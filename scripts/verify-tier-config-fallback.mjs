/**
 * Regression check for tier config fallback behavior.
 * Run: node scripts/verify-tier-config-fallback.mjs
 */
import { getTierConfig, TIER_CONFIG } from '../src/utils/tierConfig.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const freeConfig = getTierConfig('free');
assert(freeConfig, 'free tier config should exist');
assert(freeConfig.badgeColor === 'gray', 'free tier badge color should be gray');
assert(freeConfig.canChangePlan === true, 'free tier should allow changing plans');

const unknownConfig = getTierConfig('unknown-tier');
assert(unknownConfig, 'unknown tier should still return a config');
assert(
  unknownConfig.badgeColor === freeConfig.badgeColor,
  'unknown tier should fall back to free tier config'
);

assert(TIER_CONFIG.free, 'tier config map should include free tier key');

console.log('verify-tier-config-fallback: OK');
