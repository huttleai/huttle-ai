# Environment Variables Reference

This document lists all environment variables required for Huttle AI to function properly in production.

## Quick Setup Checklist

Copy these to your Vercel Project Settings > Environment Variables:

### CRITICAL (App will not work without these)

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `SUPABASE_URL` | Supabase project URL | [Supabase Dashboard](https://app.supabase.com/project/_/settings/api) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Same as above |
| `VITE_SUPABASE_URL` | Same as SUPABASE_URL | Same as above |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key | Same as above |
| `STRIPE_SECRET_KEY` | Stripe secret key | [Stripe Dashboard](https://dashboard.stripe.com/apikeys) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | Stripe Dashboard > Webhooks |
| `VITE_APP_URL` | Your production URL | e.g., `https://huttleai.com` |
| `GROK_API_KEY` | Grok API key for AI features | [x.ai API](https://x.ai/api) |
| `PERPLEXITY_API_KEY` | Perplexity API key | [Perplexity API](https://www.perplexity.ai/settings/api) |

### STRIPE PRICE IDs (Required for subscriptions)

These must match your Stripe product prices:

| Variable | Description |
|----------|-------------|
| `STRIPE_PRICE_ESSENTIALS_MONTHLY` | Essentials plan monthly price ID |
| `STRIPE_PRICE_ESSENTIALS_ANNUAL` | Essentials plan annual price ID |
| `STRIPE_PRICE_PRO_MONTHLY` | Pro plan monthly price ID |
| `STRIPE_PRICE_PRO_ANNUAL` | Pro plan annual price ID |
| `STRIPE_PRICE_FOUNDER_ANNUAL` | Founder plan annual price ID |
| `VITE_STRIPE_PRICE_ESSENTIALS_MONTHLY` | Same as above (for client-side) |
| `VITE_STRIPE_PRICE_ESSENTIALS_ANNUAL` | Same as above |
| `VITE_STRIPE_PRICE_PRO_MONTHLY` | Same as above |
| `VITE_STRIPE_PRICE_PRO_ANNUAL` | Same as above |
| `VITE_STRIPE_PRICE_FOUNDER_ANNUAL` | Same as above |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |

### SECURITY (Recommended)

| Variable | Description |
|----------|-------------|
| `CRON_SECRET` | Random string for authenticating cron jobs |

### N8N WORKFLOWS (Optional)

If not set, features will use fallback data:

| Variable | Description |
|----------|-------------|
| `N8N_WEBHOOK_URL_GENERATOR` | Content generator webhook |
| `N8N_PLAN_BUILDER_WEBHOOK` | Plan builder webhook |
| `N8N_PLAN_BUILDER_WEBHOOK_URL` | Alternative plan builder URL |
| `N8N_VIRAL_BLUEPRINT_WEBHOOK` | Viral blueprint webhook |
| `VITE_N8N_PLAN_BUILDER_WEBHOOK` | Client-side plan builder URL |
| `VITE_N8N_VIRAL_BLUEPRINT_WEBHOOK` | Client-side viral blueprint URL |
| `VITE_N8N_DASHBOARD_WEBHOOK` | Dashboard data webhook |
| `VITE_N8N_TREND_DEEP_DIVE_WEBHOOK` | Trend analysis webhook |
| `VITE_N8N_TREND_FORECASTER_WEBHOOK` | Trend forecaster webhook |
| `VITE_N8N_SOCIAL_UPDATES_WEBHOOK` | Social updates webhook |

### MAILCHIMP (Optional)

| Variable | Description |
|----------|-------------|
| `MAILCHIMP_WAITLIST_API_KEY` | Waitlist Mailchimp API key |
| `MAILCHIMP_WAITLIST_AUDIENCE_ID` | Waitlist audience ID |
| `MAILCHIMP_FOUNDERS_API_KEY` | Founders Club Mailchimp API key |
| `MAILCHIMP_FOUNDERS_AUDIENCE_ID` | Founders Club audience ID |

## Important Notes

### VITE_ Prefix Convention

- **`VITE_` prefixed** variables are exposed to the browser (client-side)
- **Non-prefixed** variables are server-side only (API routes)
- For Supabase and Stripe price IDs, you need BOTH versions set

### Security Warnings

1. **Never** set `VITE_SKIP_AUTH=true` in production
2. **Never** expose `STRIPE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` client-side
3. **Always** set `CRON_SECRET` to protect scheduled job endpoints

### Vercel-Specific Notes

In Vercel, environment variables are set per-environment (Production, Preview, Development). Make sure to set them for Production at minimum.

To set environment variables in Vercel:
1. Go to your project dashboard
2. Click "Settings" > "Environment Variables"
3. Add each variable with its value
4. Select which environments it applies to
5. Redeploy for changes to take effect

