const FOUNDER_PRICE_IDS = [
  process.env.STRIPE_PRICE_FOUNDER_ANNUAL,
  process.env.VITE_STRIPE_PRICE_FOUNDER_ANNUAL,
  process.env.STRIPE_PRICE_BUILDERS_ANNUAL,
  process.env.VITE_STRIPE_PRICE_BUILDERS_ANNUAL,
  process.env.STRIPE_PRICE_BUILDER_ANNUAL,
  process.env.VITE_STRIPE_PRICE_BUILDER_ANNUAL,
].filter(Boolean);

const PLAN_ALIASES = {
  free: 'free',
  freemium: 'free',
  essentials: 'essentials',
  essentials_monthly: 'essentials',
  essentials_annual: 'essentials',
  pro: 'pro',
  pro_monthly: 'pro',
  pro_annual: 'pro',
  founder: 'founder',
  founders_club: 'founder',
  builders_club: 'founder',
};

export function normalizePlanId(planId) {
  if (!planId) return 'free';

  const normalizedPlanId = String(planId).trim().toLowerCase();
  return PLAN_ALIASES[normalizedPlanId] || normalizedPlanId;
}

export function getPlanFromPriceId(priceId) {
  if (!priceId) return 'free';

  const priceMap = {
    [process.env.STRIPE_PRICE_ESSENTIALS_MONTHLY]: 'essentials',
    [process.env.STRIPE_PRICE_ESSENTIALS_ANNUAL]: 'essentials',
    [process.env.VITE_STRIPE_PRICE_ESSENTIALS_MONTHLY]: 'essentials',
    [process.env.VITE_STRIPE_PRICE_ESSENTIALS_ANNUAL]: 'essentials',
    [process.env.STRIPE_PRICE_PRO_MONTHLY]: 'pro',
    [process.env.STRIPE_PRICE_PRO_ANNUAL]: 'pro',
    [process.env.VITE_STRIPE_PRICE_PRO_MONTHLY]: 'pro',
    [process.env.VITE_STRIPE_PRICE_PRO_ANNUAL]: 'pro',
    [process.env.STRIPE_PRICE_FOUNDER_ANNUAL]: 'founder',
    [process.env.VITE_STRIPE_PRICE_FOUNDER_ANNUAL]: 'founder',
    [process.env.STRIPE_PRICE_BUILDERS_ANNUAL]: 'founder',
    [process.env.VITE_STRIPE_PRICE_BUILDERS_ANNUAL]: 'founder',
    [process.env.STRIPE_PRICE_BUILDER_ANNUAL]: 'founder',
    [process.env.VITE_STRIPE_PRICE_BUILDER_ANNUAL]: 'founder',
  };

  return priceMap[priceId] || 'free';
}

export function resolvePlanId({ planId, metadataPlanId, priceId }) {
  const normalizedPlanId = normalizePlanId(planId || metadataPlanId);
  if (normalizedPlanId !== 'free') {
    return normalizedPlanId;
  }

  return getPlanFromPriceId(priceId);
}

export function isFounderStylePlan({ planId, metadataPlanId, priceId }) {
  const normalizedPlanId = normalizePlanId(planId || metadataPlanId);
  return normalizedPlanId === 'founder' || FOUNDER_PRICE_IDS.includes(priceId);
}

export function getPlanDisplayName(planId) {
  const normalizedPlanId = normalizePlanId(planId);

  const labels = {
    free: 'Free',
    essentials: 'Essentials',
    pro: 'Pro',
    founder: 'Founders Club',
  };

  return labels[normalizedPlanId] || 'Pro';
}
