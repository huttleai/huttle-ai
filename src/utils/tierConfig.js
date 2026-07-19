export const TIER_CONFIG = {
  free: {
    displayName: 'Free',
    badgeLabel: 'Free',
    badgeColor: 'gray',
    priceLabel: '$0/month',
    description: 'Choose a plan to unlock Huttle AI.',
    isLocked: false,
    canChangePlan: true,
  },
  essentials: {
    displayName: 'Essentials',
    badgeLabel: 'Essentials',
    badgeColor: 'teal-light',
    priceLabel: '$15/month',
    description: 'Everything you need to start creating consistently.',
    isLocked: false,
    canChangePlan: true,
  },
  pro: {
    displayName: 'Pro',
    badgeLabel: 'Pro',
    badgeColor: 'teal',
    priceLabel: '$39/month',
    description: 'Unlimited power tools and advanced trend intelligence.',
    isLocked: false,
    canChangePlan: true,
  },
  founder: {
    displayName: 'Founders Club',
    badgeLabel: 'Founding Member',
    badgeColor: 'amber',
    priceLabel: '$199/year — Price Locked In',
    description: "You're one of our original Founding Members. Your rate and benefits are locked in forever.",
    isLocked: true,
    canChangePlan: false,
  },
  builder: {
    displayName: 'Legacy Annual',
    badgeLabel: 'Legacy Annual',
    badgeColor: 'teal',
    priceLabel: '$249/year — Price Locked In',
    description: "You're on a legacy annual plan. Your rate is locked in for as long as your plan stays active.",
    isLocked: true,
    canChangePlan: false,
  },
};

export function getTierConfig(tier) {
  return TIER_CONFIG[tier] ?? TIER_CONFIG['free'];
}
