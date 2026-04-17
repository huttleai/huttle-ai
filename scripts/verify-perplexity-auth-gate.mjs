#!/usr/bin/env node
/**
 * Regression check: ensure `/api/ai/perplexity` authenticates requests before
 * entering the `!PERPLEXITY_API_KEY` fallback branch.
 *
 * This static assertion avoids runtime imports (which require full deps in CI),
 * while still guarding the security-critical ordering invariant.
 *
 * Run: node scripts/verify-perplexity-auth-gate.mjs
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function run() {
  const targetFile = resolve(process.cwd(), 'api/ai/perplexity.js');
  const source = await readFile(targetFile, 'utf8');

  const tokenParseIndex = source.indexOf(
    "const token = parseBearerToken(req.headers.authorization);"
  );
  const tokenGateIndex = source.indexOf('if (!token) {');
  const rateLimitCallIndex = source.indexOf('const rateLimit = await checkPersistentRateLimit({');
  const rateLimitGateIndex = source.indexOf('if (!rateLimit.allowed) {');
  const fallbackBranchIndex = source.indexOf('if (!PERPLEXITY_API_KEY) {');
  const fallbackFetchIndex = source.indexOf("fetch('https://api.x.ai/v1/chat/completions'");

  assert(tokenParseIndex >= 0, 'Missing bearer token parse in perplexity handler');
  assert(tokenGateIndex >= 0, 'Missing fail-closed token guard in perplexity handler');
  assert(rateLimitCallIndex >= 0, 'Missing rate-limit check in perplexity handler');
  assert(rateLimitGateIndex >= 0, 'Missing rate-limit deny branch in perplexity handler');
  assert(fallbackBranchIndex >= 0, 'Missing Perplexity-key fallback branch');
  assert(fallbackFetchIndex >= 0, 'Missing Grok fallback fetch call');

  assert(
    tokenParseIndex < fallbackBranchIndex,
    'Token parsing must occur before entering fallback branch'
  );
  assert(
    tokenGateIndex < fallbackBranchIndex,
    'Token guard must occur before entering fallback branch'
  );
  assert(
    tokenGateIndex < fallbackFetchIndex,
    'Token guard must occur before fallback fetch call'
  );
  assert(
    rateLimitCallIndex < fallbackBranchIndex,
    'Rate-limit checks must occur before entering fallback branch'
  );
  assert(
    rateLimitGateIndex < fallbackBranchIndex,
    'Rate-limit deny branch must occur before entering fallback branch'
  );

  console.log('✓ Perplexity auth gate ordering verified');
}

run().catch((error) => {
  console.error('Perplexity auth gate regression failed:', error.message);
  process.exit(1);
});
