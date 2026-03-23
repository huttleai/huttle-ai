/**
 * Server-side Plan Builder monthly job caps (mirrors `planBuilder` in src/config/supabase.js TIER_LIMITS).
 */
export const PLAN_BUILDER_MONTHLY_BY_TIER = {
  essentials: 20,
  pro: 20,
  founder: 20,
  builder: 20,
};
