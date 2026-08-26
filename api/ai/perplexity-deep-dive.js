/**
 * Perplexity proxy — long-running deep research route.
 *
 * Same handler as `api/ai/perplexity.js`, deployed as a separate function so the
 * slow `deep_dive` feature (sonar-pro with high search context, used by Niche
 * Intel) gets its own runtime budget.
 *
 * Sharing one endpoint meant Niche Intel research had to finish inside the 60s
 * budget sized for the light callers (dashboard trending, hashtags, quick scan).
 * It regularly did not — production returned a Vercel runtime timeout 504 on
 * 2026-08-25 at 21:45:05, and the identical request succeeded 75 seconds later.
 * Splitting the route lets the slow path have the headroom it needs without
 * raising the ceiling for every other Perplexity caller.
 *
 * Behaviour, auth, caching, rate limiting and model resolution are all inherited
 * — this file intentionally holds no logic of its own so the two routes cannot
 * drift apart. The runtime budget lives in `vercel.json` under `functions`.
 */
export { default } from './perplexity.js';
