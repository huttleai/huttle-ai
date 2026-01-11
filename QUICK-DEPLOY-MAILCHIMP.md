# Quick Deploy: Mailchimp Webhooks ⚡

## Add These to Vercel Environment Variables

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

### Required (for Waitlist):
```
MAILCHIMP_WAITLIST_API_KEY = your_mailchimp_api_key-us22
MAILCHIMP_WAITLIST_AUDIENCE_ID = your_audience_id
```

### Optional (for Founders Club auto-add):
```
MAILCHIMP_FOUNDERS_API_KEY = your_founders_api_key_here
MAILCHIMP_FOUNDERS_AUDIENCE_ID = your_founders_audience_id_here
```

Then click **"Redeploy"** to apply changes.

---

## Test It Works

### Test Waitlist:
1. Visit your landing page
2. Click "Join Waitlist"
3. Enter email and submit
4. Check Mailchimp → Your Waitlist Audience for new subscriber

### Test Founders Club:
1. Click "Get Early Access" or "Become a Founding Member"
2. Complete Stripe checkout (use test mode)
3. Check Mailchimp → Founders audience for new subscriber (if configured)

---

## Files Created:
- ✅ `/api/subscribe-waitlist.js` - NEW
- ✅ `/api/stripe-webhook.js` - ENHANCED

## Status:
✅ Ready to deploy
✅ No breaking changes
✅ Works with or without Founders Club Mailchimp

---

**Need help?** See `WEBHOOK-INTEGRATION-COMPLETE.md` for full documentation.

