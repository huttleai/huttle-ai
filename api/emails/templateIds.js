/**
 * Resend template aliases used by transactional sends.
 *
 * These must match published template aliases in the Resend dashboard.
 * Do not invent UUID template IDs — Resend looks these up by alias.
 *
 * Templates that already send in production:
 *   trial-started, trial-ending-soon, trial-expired,
 *   subscription-confirmed-*, payment-failed, cancellation-confirmed,
 *   usage-alert-100
 *
 * Templates that still need to be created AND published in Resend before
 * the matching send will succeed. Shipping this code does not create them:
 *   welcome
 *   usage-alert-80
 */
export const EMAIL_TEMPLATE_IDS = {
  welcome: 'welcome',
  usageAlert80: 'usage-alert-80',
  usageAlert100: 'usage-alert-100',
  trialStarted: 'trial-started',
  trialEndingSoon: 'trial-ending-soon',
  trialExpired: 'trial-expired',
  paymentFailed: 'payment-failed',
  cancellationConfirmed: 'cancellation-confirmed',
  subscriptionConfirmedEssentials: 'subscription-confirmed-essentials',
  subscriptionConfirmedPro: 'subscription-confirmed-pro',
  subscriptionConfirmedBuilders: 'subscription-confirmed-builders',
};

/**
 * Aliases that exist in this config but are not known to be published in Resend.
 * Confirm these in the Resend dashboard before expecting live delivery.
 */
export const EMAIL_TEMPLATES_PENDING_RESEND_DASHBOARD = Object.freeze([
  EMAIL_TEMPLATE_IDS.welcome,
  EMAIL_TEMPLATE_IDS.usageAlert80,
]);

export const EMAIL_ACTIVITY_FEATURES = {
  welcome: 'welcomeEmail',
  usageAlert80: 'usageAlert80',
  usageAlert100: 'usageAlert100',
};

export const EMAIL_TIER_LABELS = {
  pro: 'Pro',
  essentials: 'Essentials',
  builder: 'Legacy Annual',
  founder: 'Founders Club',
  free: 'Free',
};
