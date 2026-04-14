import { resolvePlanContentMix } from '../src/utils/planBuilderJobResult.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertDeepEqual(actual, expected, message) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${message}\nexpected=${e}\nactual=${a}`);
  }
}

// Regression: valid JSON string but non-object should not be returned.
const fromNull = resolvePlanContentMix('null');
assertDeepEqual(fromNull, {}, 'string "null" should resolve to empty object');
assert(Object.entries(fromNull).length === 0, 'resolved null mix should be safe for Object.entries');

const fromArray = resolvePlanContentMix('[1,2,3]');
assertDeepEqual(fromArray, {}, 'array JSON should not be treated as content mix');

const fallbackToSecondSource = resolvePlanContentMix('null', '{"Educational":40,"Promotional":20}');
assertDeepEqual(
  fallbackToSecondSource,
  { Educational: 40, Promotional: 20 },
  'should use next valid source when first source is invalid'
);

const objectSource = resolvePlanContentMix({ Educational: 60, Entertaining: 30, Promotional: 10 });
assertDeepEqual(
  objectSource,
  { Educational: 60, Entertaining: 30, Promotional: 10 },
  'plain object source should pass through unchanged'
);

console.log('verify-plan-content-mix: OK');
