# Going Live Checklist

Use this checklist when switching Huttle AI from full Stripe sandbox testing to live billing.

## 1. Update Vercel environment variables

Set these in the Vercel project before deploying live billing:

- `STRIPE_SECRET_KEY=sk_live_...`
- `STRIPE_WEBHOOK_SECRET=whsec_...` from the live webhook endpoint
- `VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...`
- `VITE_STRIPE_PRICE_ESSENTIALS_MONTHLY=price_...` live price ID
- `VITE_STRIPE_PRICE_ESSENTIALS_ANNUAL=price_...` live price ID
- `VITE_STRIPE_PRICE_PRO_MONTHLY=price_...` live price ID
- `VITE_STRIPE_PRICE_PRO_ANNUAL=price_...` live price ID
- `VITE_STRIPE_PRICE_FOUNDER_ANNUAL=price_...` live price ID if Founders is still sold
- `VITE_STRIPE_PRICE_BUILDER_ANNUAL=price_...` or `VITE_STRIPE_PRICE_BUILDERS_ANNUAL=price_...` live price ID if Builders is still sold
- `VITE_APP_URL=https://huttleai.com` or your live production domain

Recommended:

- Update both `Preview` and `Production` carefully if you still use preview deployments.
- Keep sandbox values only in local/dev environments so test purchases never hit live Stripe by accident.

## 2. Register the live Stripe webhook

Create a live webhook endpoint in Stripe:

- URL: `https://huttleai.com/api/stripe-webhook`
- If production uses a different domain, use `${VITE_APP_URL}/api/stripe-webhook`

Subscribe the live webhook to the events used by `api/stripe-webhook.js`:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.trial_will_end`
- `invoice.payment_failed`

Then copy the live signing secret into `STRIPE_WEBHOOK_SECRET` in Vercel.

## 3. Confirm n8n uses production webhook URLs

Check every n8n env var and confirm it points to a production endpoint, not a test URL:

- `VITE_N8N_IGNITE_ENGINE_WEBHOOK`
- `VITE_N8N_PLAN_BUILDER_WEBHOOK`
- `VITE_N8N_CONTENT_REMIX_STUDIO_WEBHOOK`

Verify each URL uses the production n8n path, typically `/webhook/...`, not `/webhook-test/...`.

## 4. Verify other environment-specific settings

Check these before launching:

- `VITE_APP_URL` matches the public production domain used by Stripe success and cancel redirects.
- Stripe products and live prices exist for every plan shown in the app.
- Stripe Customer Portal is enabled in the live Stripe account.
- Any live Mailchimp audience settings used by webhook flows are correct if launch members should still be tagged.
- Supabase production environment is the intended one for live customer records and webhook writes.

## 5. Verify the live flow end to end

After deployment:

1. Open the app on the production domain and confirm checkout opens with live Stripe, not test Stripe.
2. Complete a real live purchase with a low-risk internal test card/payment method.
3. Confirm Stripe shows the live customer, checkout session, and subscription.
4. Confirm the live webhook delivers successfully in Stripe and `api/stripe-webhook.js` processes the event.
5. Confirm Supabase updates:
   - `user_profile.stripe_customer_id`
   - `subscriptions.stripe_subscription_id`
   - `subscriptions.tier`
   - `subscriptions.status`
6. Confirm the user lands back on `/dashboard` and sees paid access without manual refresh issues.
7. Open `/dashboard/subscription` and confirm billing details render correctly.
8. Open the Stripe customer portal from the app and confirm it uses the live account.
9. Test one free account with no subscription and confirm it loads the dashboard on the free fallback without a forced redirect.
