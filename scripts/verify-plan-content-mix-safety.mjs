import assert from 'node:assert/strict';
import { resolvePlanContentMix } from '../src/utils/planContentMix.js';

function run() {
  const fromObject = resolvePlanContentMix({ educational: 35, entertaining: 25 });
  assert.deepEqual(fromObject, { educational: 35, entertaining: 25 });

  const fromJson = resolvePlanContentMix('{"Educational":30,"Promotional":10}');
  assert.deepEqual(fromJson, { Educational: 30, Promotional: 10 });

  const nullJsonFallsThrough = resolvePlanContentMix('null', '{"Social Proof":20}');
  assert.deepEqual(nullJsonFallsThrough, { 'Social Proof': 20 });

  const arrayJsonFallsThrough = resolvePlanContentMix('[]', '{"Community":40}');
  assert.deepEqual(arrayJsonFallsThrough, { Community: 40 });

  const scalarJsonFallsThrough = resolvePlanContentMix('42', { Authority: 15 });
  assert.deepEqual(scalarJsonFallsThrough, { Authority: 15 });

  const malformedJsonFallsThrough = resolvePlanContentMix('{"bad"', '{"Educational":50}');
  assert.deepEqual(malformedJsonFallsThrough, { Educational: 50 });

  const noValidSourcesReturnsEmpty = resolvePlanContentMix('null', '[]', '"text"', 0, false, null, undefined);
  assert.deepEqual(noValidSourcesReturnsEmpty, {});
}

run();
console.log('verify-plan-content-mix-safety: ok');
