/**
 * Verification harness for the 2026-08-25 live QA audit fixes.
 *
 * Each case states the pre-fix (buggy) behaviour and asserts the post-fix
 * behaviour, so the script doubles as a reproduction of the original defect.
 *
 * Run: node scripts/verify-qa-2026-08-25-fixes.mjs
 */
import { readFileSync } from 'node:fs';
import { normalizeAiPlaceholder } from '../src/utils/textHelpers.js';
import { assembleFullPost } from '../src/utils/fullPostAssembly.js';
import { buildSubscriptionPayload } from '../api/_utils/billing.js';

let passed = 0;
let failed = 0;

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}`);
    console.log(`        expected: ${JSON.stringify(expected)}`);
    console.log(`        actual:   ${JSON.stringify(actual)}`);
  }
}

console.log('\nBUG-03 item 3 — Ignite "Text Overlay" must never render raw null');
console.log('  Pre-fix: `imageDirection.textOverlay || \'None\'` passed the *string*');
console.log('  "null" straight through, so the DOM showed the text `null`.');
{
  // The exact shape the model returns when the prompt says "<text overlay or null>".
  check('string "null" collapses to empty', normalizeAiPlaceholder('null'), '');
  check('string "NULL" collapses to empty', normalizeAiPlaceholder('NULL'), '');
  check('string "None." collapses to empty', normalizeAiPlaceholder('None.'), '');
  check('string "N/A" collapses to empty', normalizeAiPlaceholder('N/A'), '');
  check('JSON null collapses to empty', normalizeAiPlaceholder(null), '');
  check('undefined collapses to empty', normalizeAiPlaceholder(undefined), '');
  check('object payload collapses to empty', normalizeAiPlaceholder({ a: 1 }), '');
  check('real overlay text is preserved', normalizeAiPlaceholder('  3 recovery mistakes  '), '3 recovery mistakes');
  check('array of overlays joins', normalizeAiPlaceholder(['Line one', 'null', 'Line two']), 'Line one, Line two');

  // The render-site contract: falsy -> caller substitutes 'None', never raw null.
  const rendered = normalizeAiPlaceholder('null') || 'None';
  check('render site shows "None" not "null"', rendered, 'None');
}

console.log('\nBUG-05 — Saved Full Post must not duplicate the hook or the CTA');
console.log('  Pre-fix: assembly was [hook, caption, hashtags, cta].join("\\n\\n"),');
console.log('  but the caption prompt says "Use this exact opening line" (the hook)');
console.log('  and "End with one clear CTA", so both were already inside the caption.');
{
  const hook = 'Most people recover wrong after strength training.';
  const cta = 'Which one are you guilty of?';

  // Caption exactly as the model returns it for Full Post Builder: opens with the
  // verbatim hook, closes with a CTA line.
  const caption = [
    hook,
    'Skipping protein in the first hour blunts your gains more than a missed set.',
    cta,
  ].join('\n\n');

  const hashtags = ['#recovery', '#strengthtraining'];

  const result = assembleFullPost({ hook, caption, hashtags, cta });

  const hookOccurrences = result.split(hook).length - 1;
  const ctaOccurrences = result.split(cta).length - 1;

  check('hook appears exactly once', hookOccurrences, 1);
  check('CTA appears exactly once', ctaOccurrences, 1);
  check('hashtags survive', result.includes('#recovery #strengthtraining'), true);
  check('body copy survives', result.includes('blunts your gains'), true);

  // Guard the opposite direction: when the caption does NOT already contain the
  // hook/CTA, both must still be added.
  const plainCaption = 'Recovery is where the adaptation actually happens.';
  const plainResult = assembleFullPost({ hook, caption: plainCaption, hashtags, cta });
  check('standalone hook still prepended', plainResult.startsWith(hook), true);
  check('standalone CTA still appended', plainResult.trimEnd().endsWith(cta), true);

  // Near-miss matching: trailing punctuation / case drift must still dedupe.
  const driftedCaption = `${hook.toUpperCase()}\n\nSome value.\n\n${cta}`;
  const driftedResult = assembleFullPost({ hook, caption: driftedCaption, hashtags, cta });
  check('case-drifted hook not duplicated', driftedResult.toLowerCase().split(hook.toLowerCase()).length - 1, 1);

  // Empty / missing parts must not create blank paragraphs.
  check('no leading blank paragraphs', /^\n/.test(assembleFullPost({ hook: '', caption, hashtags: [], cta: '' })), false);
  check('no doubled blank runs', /\n{3,}/.test(result), false);
}

console.log('\nBUG-02 — Billing start/renewal dates must resolve');
console.log('  Pre-fix: buildSubscriptionPayload read current_period_start/end off the');
console.log('  Subscription object. Stripe removed those in API 2025-03-31.basil (SDK 20.x');
console.log('  pins 2025-12-15.clover), so both were undefined -> null, and the ternary');
console.log('  `stripeSubscription ? ... : record` blocked the database fallback.');
{
  const START = 1_754_000_000; // unix seconds
  const END = 1_756_678_400;

  // Shape returned by Stripe today: period lives on the subscription item.
  const modernStripeSubscription = {
    id: 'sub_live',
    customer: 'cus_live',
    status: 'active',
    items: {
      data: [{ id: 'si_1', current_period_start: START, current_period_end: END, price: { id: 'price_x' } }],
    },
  };

  const modern = buildSubscriptionPayload({
    stripeSubscription: modernStripeSubscription,
    subscriptionRecord: null,
  });
  check('start date resolves from subscription item', modern.currentPeriodStart, new Date(START * 1000).toISOString());
  check('renewal date resolves from subscription item', modern.currentPeriodEnd, new Date(END * 1000).toISOString());

  // Legacy pinned API version: fields still on the subscription itself.
  const legacy = buildSubscriptionPayload({
    stripeSubscription: {
      id: 'sub_legacy',
      status: 'active',
      current_period_start: START,
      current_period_end: END,
      items: { data: [] },
    },
    subscriptionRecord: null,
  });
  check('legacy top-level start still works', legacy.currentPeriodStart, new Date(START * 1000).toISOString());
  check('legacy top-level end still works', legacy.currentPeriodEnd, new Date(END * 1000).toISOString());

  // Stripe has a subscription but reports no period at all -> must fall back to
  // the database record instead of returning null (this fallback was unreachable).
  const dbFallback = buildSubscriptionPayload({
    stripeSubscription: { id: 'sub_noperiod', status: 'active', items: { data: [{ id: 'si_2' }] } },
    subscriptionRecord: {
      current_period_start: '2026-08-01T00:00:00.000Z',
      current_period_end: '2026-09-01T00:00:00.000Z',
      tier: 'founder',
      status: 'active',
    },
  });
  check('falls back to database start', dbFallback.currentPeriodStart, '2026-08-01T00:00:00.000Z');
  check('falls back to database end', dbFallback.currentPeriodEnd, '2026-09-01T00:00:00.000Z');

  // Genuinely absent everywhere -> null (renders as a dash, never "Loading...").
  const empty = buildSubscriptionPayload({
    stripeSubscription: { id: 'sub_empty', status: 'active', items: { data: [] } },
    subscriptionRecord: { tier: 'pro', status: 'active' },
  });
  check('absent period yields null, not a fake loading state', empty.currentPeriodStart, null);

  // Reproduce the pre-fix behaviour to prove the bug was real.
  const preFixValue = modernStripeSubscription
    ? (modernStripeSubscription.current_period_start
        ? new Date(modernStripeSubscription.current_period_start * 1000).toISOString()
        : null)
    : null;
  check('pre-fix logic did return null (bug reproduced)', preFixValue, null);
}

console.log('\nBUG-03/04 — client brief timeout must exceed the proxy budget');
console.log('  Pre-fix: client aborted at 90s while vercel.json allows the proxy 120s.');
console.log('  A real run returned a valid blueprint at 104s and was thrown away,');
console.log('  silently downgrading the user to the Grok fallback.');
{
  const igniteSource = readFileSync(new URL('../src/pages/IgniteEngine.jsx', import.meta.url), 'utf8');
  const vercelConfig = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));

  const clientTimeoutMs = Number(
    igniteSource.match(/const BRIEF_REQUEST_TIMEOUT_MS = (\d+)/)?.[1] ?? NaN
  );
  const proxyMaxDurationSec = vercelConfig.functions?.['api/ignite-engine-proxy.js']?.maxDuration;

  check('client timeout is defined', Number.isFinite(clientTimeoutMs), true);
  check('proxy maxDuration is defined', typeof proxyMaxDurationSec, 'number');
  check(
    'client waits longer than the proxy budget',
    clientTimeoutMs > proxyMaxDurationSec * 1000,
    true
  );
  check(
    'the observed 104s success would now be kept',
    104_000 < clientTimeoutMs,
    true
  );
  check('pre-fix 90s budget would have discarded it (bug reproduced)', 104_000 < 90_000, false);
  check('no stale "90 seconds" copy remains', /timed out after 90 seconds/.test(igniteSource), false);
}

console.log('\nBUG-01 follow-up — slow deep research is isolated on its own function');
console.log('  Pre-fix: Niche Intel research shared /api/ai/perplexity with the light');
console.log('  callers, so it had to finish inside a 60s budget sized for them.');
{
  const vercelConfig = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const perplexitySource = readFileSync(new URL('../src/services/perplexityAPI.js', import.meta.url), 'utf8');
  const nicheIntelSource = readFileSync(new URL('../src/pages/NicheIntel.jsx', import.meta.url), 'utf8');
  const localServer = readFileSync(new URL('../server/local-api-server.js', import.meta.url), 'utf8');

  const sharedBudget = vercelConfig.functions?.['api/ai/perplexity.js']?.maxDuration;
  const deepDiveBudget = vercelConfig.functions?.['api/ai/perplexity-deep-dive.js']?.maxDuration;

  check('deep dive route has its own budget', typeof deepDiveBudget, 'number');
  check('deep dive budget exceeds the shared one', deepDiveBudget > sharedBudget, true);
  check('shared budget unchanged for light callers', sharedBudget, 60);
  check('deep dive budget clears the observed ~75s overrun', deepDiveBudget * 1000 > 75_000, true);
  check(
    'client routes deep_dive to the dedicated endpoint',
    /perplexityFeature === 'deep_dive'|cache\?\.type === 'niche_intel'/.test(perplexitySource),
    true
  );
  check('dedicated route registered for local dev', localServer.includes('/api/ai/perplexity-deep-dive'), true);

  const runTimeoutMs = Number(
    nicheIntelSource.match(/const NICHE_INTEL_RUN_TIMEOUT_MS = (\d+)/)?.[1] ?? NaN
  );
  const grokBudget = vercelConfig.functions?.['api/ai/grok.js']?.maxDuration ?? 0;
  check(
    'client run timeout exceeds both server legs',
    runTimeoutMs > (deepDiveBudget + grokBudget) * 1000,
    true
  );
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
