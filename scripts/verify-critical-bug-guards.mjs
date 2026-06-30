import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const usageAlert = read('api/emails/send-usage-alert-trigger.js');
assert.match(usageAlert, /authenticateBillingRequest/);
assert.match(usageAlert, /requestedUserId[\s\S]+requestedUserId !== userId/);
assert.doesNotMatch(usageAlert, /json\(\{\s*sent:\s*true,\s*email/);

const cancellationFeedback = read('api/submit-cancellation-feedback.js');
assert.match(cancellationFeedback, /authenticateBillingRequest/);
assert.match(cancellationFeedback, /requestedUserId[\s\S]+requestedUserId !== userId/);
assert.match(cancellationFeedback, /user_id:\s*userId/);

const cancellationModal = read('src/components/CancelSubscriptionModal.jsx');
assert.match(cancellationModal, /supabase\.auth\.getSession/);
assert.match(cancellationModal, /Authorization:\s*`Bearer \$\{session\.access_token\}`/);

const checkout = read('api/create-checkout-session.js');
assert.match(checkout, /getPlanFromPriceId\(priceId\)/);
assert.match(checkout, /requestedPlanId && requestedPlanId !== pricePlanId/);
assert.doesNotMatch(checkout, /payment_method_types:\s*\['card'\]/);

const stripePlans = read('api/_utils/stripePlans.js');
assert.match(stripePlans, /const pricePlanId = getPlanFromPriceId\(priceId\)/);
assert.match(stripePlans, /if \(pricePlanId\)[\s\S]+return pricePlanId/);

const webhook = read('api/stripe-webhook.js');
assert.match(webhook, /return res\.status\(500\)\.json\(\{ error: 'Failed to record webhook event' \}\)/);
assert.match(webhook, /return res\.status\(500\)\.json\(\{ error: 'Internal processing error' \}\)/);
assert.match(webhook, /Could not resolve Supabase user for checkout session/);
assert.match(webhook, /Could not resolve Supabase user for deleted subscription/);
assert.doesNotMatch(webhook, /cancel_at_period_end:\s*false,[\s\S]{0,180}invoice\.paid/);

const subscriptionStatus = read('api/subscription-status.js');
assert.match(subscriptionStatus, /Stripe is authoritative for paid\s+\/\/ access/);
assert.doesNotMatch(subscriptionStatus, /If Stripe has no active subscription, return what Supabase knows/);

const subscriptionContext = read('src/context/SubscriptionContext.jsx');
assert.match(subscriptionContext, /stripeSubscription\?\.status \|\| stripeResult\.status \|\| databaseSubscription\?\.status/);
assert.match(subscriptionContext, /resolvedStripeTier \|\| databaseTier/);

const planBuilderService = read('src/services/planBuilderAPI.js');
assert.match(planBuilderService, /create-plan-builder-job/);
assert.match(planBuilderService, /skipWebhook:\s*true/);
assert.doesNotMatch(planBuilderService, /\.from\('jobs'\)\s*\.insert/);

const planBuilderProxy = read('api/plan-builder-proxy.js');
assert.match(planBuilderProxy, /Plan Builder usage was not reserved/);
assert.match(planBuilderProxy, /\.contains\('metadata', \{ job_id \}\)/);

const aiUsage = read('src/hooks/useAIUsage.js');
assert.match(aiUsage, /overallLimit <= 0/);
assert.match(aiUsage, /send-usage-alert-trigger/);
assert.match(aiUsage, /Authorization:\s*`Bearer \$\{session\.access_token\}`/);

console.log('Critical bug guard checks passed.');
