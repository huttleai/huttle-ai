/**
 * Dev check: Full Post Builder hook parsing (no Grok / Supabase).
 * Run: node scripts/verify-full-post-hooks-parser.mjs
 */
import {
  parseFullPostHookList,
  extractHooksFromHookBuilderResult,
  isPlausibleHookLine,
} from '../src/utils/fullPostHooksParser.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const validNumbered = `1. First hook line here
2. Second hook line
3. Third
4. Fourth`;

assert(parseFullPostHookList(validNumbered).length === 4, 'numbered hooks');

assert(
  parseFullPostHookList('["first hook line","second line","third line","fourth line"]').length === 4,
  'json string array',
);

assert(
  parseFullPostHookList('{"hooks":["one hook here","two here","three here","four here"]}').length === 4,
  'json hooks key',
);

assert(
  parseFullPostHookList('{"hooks":[{"hook":"First real hook line"},{"hook":"Second hook line here"}]}').length === 2,
  'json hooks objects',
);

assert(parseFullPostHookList('').length === 0, 'empty string');
assert(parseFullPostHookList('   ').length === 0, 'whitespace');

// Prose with clear junk opener should not yield hooks
assert(
  parseFullPostHookList('Here are some ideas but no structure.').length === 0,
  'short junk opener prose should not yield hooks',
);

// Malformed JSON body → empty (not random lines)
assert(parseFullPostHookList('{not json').length === 0, 'invalid json');

// Plain lines without numbers/bullets (multi-line, hook-like)
const plainLines = `Still guessing about morning routines? Here is what actually works for busy founders.
Most people stack five habits on day one and burn out before Wednesday.
If you only keep one change from this post, make it the one that protects your sleep.`;
const plainParsed = parseFullPostHookList(plainLines);
assert(plainParsed.length >= 2, 'plain multi-line prose should yield hooks');

assert(isPlausibleHookLine('Save this for when you rewrite your hook later.') === true, 'plausible hook');
assert(isPlausibleHookLine('Ok.') === false, 'too short');
assert(isPlausibleHookLine('https://example.com/fake hook line here extra words more text') === false, 'url rejected');

const hookBuilderLike = {
  success: true,
  hooks: `1. First backup hook line here for testing
2. Second backup hook line
3. Third line with enough words to count
4. Fourth line also has enough words here`,
};
assert(extractHooksFromHookBuilderResult(hookBuilderLike).length === 4, 'hook builder numbered string');

// Simulate primary empty + fallback object shape (no double charge in app — hooksRunPaidRef; this only checks extraction)
assert(
  extractHooksFromHookBuilderResult({ success: true, hookIdeas: [{ hook: 'One solid hook line here' }, { hook: 'Another hook line with words' }] }).length === 2,
  'hookIdeas extraction',
);

console.log('verify-full-post-hooks-parser: OK');
