/**
 * Dev-only: print the model id and per-feature reasoning efforts the app uses.
 * Single source of truth: src/config/grokConfig.js (no env vars involved).
 *
 *   node scripts/dev-grok-models-verify.mjs
 */
import { GROK_MODEL, GROK_EFFORT } from '../src/config/grokConfig.js';

console.log('[grok] GROK_MODEL:', GROK_MODEL);
console.log('[grok] GROK_EFFORT map:');
for (const [featureKey, effort] of Object.entries(GROK_EFFORT)) {
  console.log(`  ${featureKey.padEnd(24)} → ${effort}`);
}
