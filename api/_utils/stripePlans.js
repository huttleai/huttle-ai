const LAUNCH_PRICE_IDS = [
  process.env.STRIPE_PRICE_FOUNDER_ANNUAL,
  process.env.VITE_STRIPE_PRICE_FOUNDER_ANNUAL,
  process.env.STRIPE_PRICE_BUILDER_ANNUAL,
  process.env.VITE_STRIPE_PRICE_BUILDER_ANNUAL,
].filter(Boolean);

// `builder` (Builders Club) is closed to new signups — no price is offered for
// it in getPriceIdForPlan. The alias, price-id lookup, and display name below
// are retained on purpose so existing legacy subscriptions still resolve.
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
    [process.env.STRIPE_PRICE_BUILDER_ANNUAL]: 'builder',
    [process.env.VITE_STRIPE_PRICE_BUILDER_ANNUAL]: 'builder',
  };

  return priceMap[priceId] || null;
}

export function getPriceIdForPlan({ planId, billingCycle = 'monthly' }) {
  const normalizedPlanId = normalizePlanId(planId);
  if (!normalizedPlanId) return null;

  const priceMap = {
    essentials: {
      monthly: process.env.STRIPE_PRICE_ESSENTIALS_MONTHLY || process.env.VITE_STRIPE_PRICE_ESSENTIALS_MONTHLY || null,
      annual: process.env.STRIPE_PRICE_ESSENTIALS_ANNUAL || process.env.VITE_STRIPE_PRICE_ESSENTIALS_ANNUAL || null,
    },
    pro: {
      monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || process.env.VITE_STRIPE_PRICE_PRO_MONTHLY || null,
      annual: process.env.STRIPE_PRICE_PRO_ANNUAL || process.env.VITE_STRIPE_PRICE_PRO_ANNUAL || null,
    },
    founder: {
      annual: process.env.STRIPE_PRICE_FOUNDER_ANNUAL || process.env.VITE_STRIPE_PRICE_FOUNDER_ANNUAL || null,
    },
  };

  return priceMap[normalizedPlanId]?.[billingCycle] || null;
}

/**
 * Price IDs that may be purchased through Checkout. Founders/Builders annual
 * prices stay in getPlanFromPriceId / getPriceIdForPlan so existing members
 * still resolve, but they must not be sold as new Checkout sessions.
 */
const PURCHASABLE_CHECKOUT_PRICE_ENV_KEYS = [
  ['STRIPE_PRICE_ESSENTIALS_MONTHLY', 'VITE_STRIPE_PRICE_ESSENTIALS_MONTHLY'],
  ['STRIPE_PRICE_ESSENTIALS_ANNUAL', 'VITE_STRIPE_PRICE_ESSENTIALS_ANNUAL'],
  ['STRIPE_PRICE_PRO_MONTHLY', 'VITE_STRIPE_PRICE_PRO_MONTHLY'],
  ['STRIPE_PRICE_PRO_ANNUAL', 'VITE_STRIPE_PRICE_PRO_ANNUAL'],
];

export function getPurchasableCheckoutPriceIds() {
  const ids = new Set();
  for (const keys of PURCHASABLE_CHECKOUT_PRICE_ENV_KEYS) {
    for (const key of keys) {
      const value = process.env[key];
      if (typeof value === 'string' && value.trim()) {
        ids.add(value.trim());
      }
    }
  }
  return ids;
}

export function isPurchasableCheckoutPriceId(priceId) {
  if (!priceId || typeof priceId !== 'string') return false;
  return getPurchasableCheckoutPriceIds().has(priceId.trim());
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
    builder: 'Legacy Annual',
    founder: 'Founders Club',
  };

  return labels[normalizedPlanId] || 'Subscription';
}
