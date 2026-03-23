/**
 * Dev-only: print which model IDs the app uses for each Grok mode.
 * - `fast` (non-reasoning) → `generateCaption` when not Full Post Builder only; humanizer/scorer CTAs/hashtags outside FP stay on fast.
 * - `reasoning` → Full Post Builder, Hook Builder hooks, most AI Power Tools copy, analyzeNiche (GROK_MODEL_REASONING).
 *
 * Reads the same env vars as vite.config.js loadEnv (repo root .env).
 *
 *   node scripts/dev-grok-models-verify.mjs
 */
import 'dotenv/config';

const fast = (process.env.GROK_MODEL_NON_REASONING || 'grok-4-1-fast-non-reasoning').trim();
const reasoning = (process.env.GROK_MODEL_REASONING || 'grok-4-1-fast-reasoning').trim();

console.log('[grok] GROK_MODEL_NON_REASONING (fast path): ', fast);
console.log('[grok] GROK_MODEL_REASONING (quality path):   ', reasoning);
