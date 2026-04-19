/**
 * Server-side Plan Builder monthly caps.
 *
 * These numbers are the single server-side source of truth, mirroring
 * FEATURE_RUN_CAPS in src/config/creditConfig.js (client). If you change
 * one side, change the other — they must stay in sync.
 *
 * Per-period caps (7-day / 14-day) replace the old combined `planBuilder` cap.
 * The 14-day cap is intentionally 0 for Essentials — that tier cannot use
 * 14-day plans at all, and the handler returns HTTP 403 for that combo.
 */
export const PLAN_BUILDER_7DAY_MONTHLY_BY_TIER = {
  essentials: 3,
  pro: 10,
  founder: 10,
  builder: 10,
};

export const PLAN_BUILDER_14DAY_MONTHLY_BY_TIER = {
  essentials: 0,
  pro: 5,
  founder: 5,
  builder: 5,
};

/** Tiers that can access 14-day plans at all. */
export const PLAN_BUILDER_14DAY_ALLOWED_TIERS = ['pro', 'founder', 'builder'];

/** Back-compat export — total allowance (sum of both periods). */
export const PLAN_BUILDER_MONTHLY_BY_TIER = {
  essentials:
    PLAN_BUILDER_7DAY_MONTHLY_BY_TIER.essentials +
    PLAN_BUILDER_14DAY_MONTHLY_BY_TIER.essentials,
  pro: PLAN_BUILDER_7DAY_MONTHLY_BY_TIER.pro + PLAN_BUILDER_14DAY_MONTHLY_BY_TIER.pro,
  founder:
    PLAN_BUILDER_7DAY_MONTHLY_BY_TIER.founder +
    PLAN_BUILDER_14DAY_MONTHLY_BY_TIER.founder,
  builder:
    PLAN_BUILDER_7DAY_MONTHLY_BY_TIER.builder +
    PLAN_BUILDER_14DAY_MONTHLY_BY_TIER.builder,
};

/**
 * Resolve the relevant cap and feature key for the requested period.
 * @param {number|string} period - The requested plan length (7 or 14).
 * @param {string} tier
 * @returns {{ featureKey: 'planBuilder7Day' | 'planBuilder14Day', cap: number }}
 */
export function resolvePlanBuilderCap(period, tier) {
  const isFourteenDay = Number(period) === 14;
  if (isFourteenDay) {
    return {
      featureKey: 'planBuilder14Day',
      cap: PLAN_BUILDER_14DAY_MONTHLY_BY_TIER[tier] ?? 0,
    };
  }
  return {
    featureKey: 'planBuilder7Day',
    cap: PLAN_BUILDER_7DAY_MONTHLY_BY_TIER[tier] ?? 0,
  };
}
