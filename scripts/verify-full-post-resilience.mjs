/**
 * Dev check: billing intent for Full Post hook step (no UI / no network).
 * App behavior: hooksRunPaidRef ensures at most one successful charge per wizard run
 * when either primary `generateFullPostHooks` or Hook Builder fallback returns hooks.
 * Run: node scripts/verify-full-post-resilience.mjs
 */

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/** Mirrors FullPostBuilder charge-on-first-success batch semantics. */
function simulateHookStepCharges(events) {
  let paid = false;
  let chargeCount = 0;

  for (const e of events) {
    if (e.kind === 'success_batch' && !paid) {
      paid = true;
      chargeCount += 1;
    }
  }
  return { chargeCount };
}

let r = simulateHookStepCharges([{ kind: 'fail' }, { kind: 'fail' }, { kind: 'success_batch' }]);
assert(r.chargeCount === 1, 'charge once after failures then success');

r = simulateHookStepCharges([{ kind: 'success_batch' }, { kind: 'success_batch' }]);
assert(r.chargeCount === 1, 'second success batch does not charge again');

r = simulateHookStepCharges([{ kind: 'fail' }, { kind: 'fail' }]);
assert(r.chargeCount === 0, 'no charge if no successful batch');

console.log('verify-full-post-resilience: OK');
