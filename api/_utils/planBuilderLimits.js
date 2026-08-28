/**
 * Server-side Plan Builder monthly caps.
 *
 * Cap numbers are resolved from src/config/creditConfig.js so paid and trial
 * allowances cannot drift. The 14-day cap is intentionally 0 for Essentials —
 * that tier cannot use 14-day plans at all, and the handler returns HTTP 403
 * for that combo (PLAN_BUILDER_14DAY_ALLOWED_TIERS). Trial caps apply on top
 * of that gate, not instead of it.
 */
import { FEATURE_RUN_CAPS, getFeatureRunCap } from '../../src/config/creditConfig.js';

export const PLAN_BUILDER_7DAY_MONTHLY_BY_TIER = FEATURE_RUN_CAPS.planBuilder7Day;

export const PLAN_BUILDER_14DAY_MONTHLY_BY_TIER = FEATURE_RUN_CAPS.planBuilder14Day;

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
 * @param {boolean} [isTrialing]
 * @returns {{ featureKey: 'planBuilder7Day' | 'planBuilder14Day', cap: number }}
 */
export function resolvePlanBuilderCap(period, tier, isTrialing = false) {
  const isFourteenDay = Number(period) === 14;
  const featureKey = isFourteenDay ? 'planBuilder14Day' : 'planBuilder7Day';
  const cap = getFeatureRunCap(featureKey, tier, isTrialing);
  return {
    featureKey,
    cap: typeof cap === 'number' ? cap : 0,
  };
}
