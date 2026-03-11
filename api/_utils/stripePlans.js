const LAUNCH_PRICE_IDS = [
  process.env.STRIPE_PRICE_FOUNDER_ANNUAL,
  process.env.VITE_STRIPE_PRICE_FOUNDER_ANNUAL,
  process.env.STRIPE_PRICE_BUILDERS_ANNUAL,
  process.env.VITE_STRIPE_PRICE_BUILDERS_ANNUAL,
  process.env.STRIPE_PRICE_BUILDER_ANNUAL,
  process.env.VITE_STRIPE_PRICE_BUILDER_ANNUAL,
].filter(Boolean);

const PLAN_ALIASES = {
  essentials: 'essentials',
  essentials_monthly: 'essentials',
  essentials_annual: 'essentials',
  pro: 'pro',
  pro_monthly: 'pro',
  pro_annual: 'pro',
  builder: 'builder',
  builders: 'builder',
  builder_annual: 'builder',
  builders_annual: 'builder',
  builders_club: 'builder',
  founder: 'founder',
  founders_club: 'founder',
};

export function normalizePlanId(planId) {
  if (!planId) return null;

  const normalizedPlanId = String(planId).trim().toLowerCase();
  return PLAN_ALIASES[normalizedPlanId] || null;
}

export function getPlanFromPriceId(priceId) {
  if (!priceId) return null;

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
    [process.env.STRIPE_PRICE_BUILDERS_ANNUAL]: 'builder',
    [process.env.VITE_STRIPE_PRICE_BUILDERS_ANNUAL]: 'builder',
    [process.env.STRIPE_PRICE_BUILDER_ANNUAL]: 'builder',
    [process.env.VITE_STRIPE_PRICE_BUILDER_ANNUAL]: 'builder',
  };

  return priceMap[priceId] || null;
}

export function resolvePlanId({ planId, metadataPlanId, priceId }) {
  const normalizedPlanId = normalizePlanId(planId || metadataPlanId);
  if (normalizedPlanId) {
    return normalizedPlanId;
  }

  return getPlanFromPriceId(priceId);
}

export function isLaunchPlan({ planId, metadataPlanId, priceId }) {
  const normalizedPlanId = normalizePlanId(planId || metadataPlanId);
  return normalizedPlanId === 'founder' || normalizedPlanId === 'builder' || LAUNCH_PRICE_IDS.includes(priceId);
}

export function getPlanDisplayName(planId) {
  const normalizedPlanId = normalizePlanId(planId);

  const labels = {
    essentials: 'Essentials',
    pro: 'Pro',
    builder: 'Builders Club',
    founder: 'Founders Club',
  };

  return labels[normalizedPlanId] || 'Subscription';
}
