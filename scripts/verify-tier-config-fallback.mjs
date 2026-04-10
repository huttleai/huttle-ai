import process from 'node:process';
import { FREE_TIER_CONFIG, getTierConfig } from '../src/utils/tierConfig.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertConfigShape(config, label) {
  assert(config && typeof config === 'object', `${label} should be an object`);
  assert(typeof config.displayName === 'string', `${label}.displayName should be a string`);
  assert(typeof config.badgeLabel === 'string', `${label}.badgeLabel should be a string`);
  assert(typeof config.badgeColor === 'string', `${label}.badgeColor should be a string`);
  assert(typeof config.priceLabel === 'string', `${label}.priceLabel should be a string`);
  assert(typeof config.description === 'string', `${label}.description should be a string`);
  assert(typeof config.isLocked === 'boolean', `${label}.isLocked should be a boolean`);
  assert(typeof config.canChangePlan === 'boolean', `${label}.canChangePlan should be a boolean`);
}

function main() {
  const freeConfig = getTierConfig('free');
  assert(freeConfig === FREE_TIER_CONFIG, 'free tier should resolve to FREE_TIER_CONFIG');
  assertConfigShape(freeConfig, 'free config');

  const unknownConfig = getTierConfig('unknown-tier');
  assert(unknownConfig === FREE_TIER_CONFIG, 'unknown tiers should fall back to FREE_TIER_CONFIG');
  assertConfigShape(unknownConfig, 'unknown fallback config');

  console.log('Tier config fallback checks passed.');
}

try {
  main();
} catch (error) {
  console.error('Tier config fallback checks failed:', error.message);
  process.exit(1);
}
