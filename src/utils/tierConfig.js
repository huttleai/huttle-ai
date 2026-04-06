export const TIER_CONFIG = {
  essentials: {
    displayName: 'Essentials',
    badgeLabel: 'Essentials',
    badgeColor: 'blue',
    priceLabel: '$15/month',
    description: 'Everything you need to start creating consistently.',
    isLocked: false,
    canChangePlan: true,
  },
  pro: {
    displayName: 'Pro',
    badgeLabel: 'Pro Member',
    badgeColor: 'purple',
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
    displayName: 'Builders Club',
    badgeLabel: 'Builders Club',
    badgeColor: 'silver',
    priceLabel: '$249/year — Price Locked In',
    description: "You're a Builders Club member. Your rate is locked in for as long as your plan stays active.",
    isLocked: true,
    canChangePlan: false,
  },
};

export function getTierConfig(tier) {
  return TIER_CONFIG[tier] ?? TIER_CONFIG['free'];
}
