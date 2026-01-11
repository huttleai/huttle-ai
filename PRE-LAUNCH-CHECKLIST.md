# ✅ Pre-Launch Checklist

Use this checklist to verify everything is working before going live.

---

## 🔐 1. Environment Variables (Vercel)

- [ ] `VITE_STRIPE_PUBLISHABLE_KEY` - Added (starts with `pk_`)
- [ ] `STRIPE_SECRET_KEY` - Added (starts with `sk_`)
- [ ] `STRIPE_WEBHOOK_SECRET` - Added (starts with `whsec_`)
- [ ] `VITE_STRIPE_PRICE_ESSENTIALS_MONTHLY` - Added (starts with `price_`)
- [ ] `VITE_STRIPE_PRICE_ESSENTIALS_ANNUAL` - Added (starts with `price_`)
- [ ] `VITE_STRIPE_PRICE_PRO_MONTHLY` - Added (starts with `price_`)
- [ ] `VITE_STRIPE_PRICE_PRO_ANNUAL` - Added (starts with `price_`)
- [ ] `VITE_SUPABASE_URL` - Added
- [ ] `VITE_SUPABASE_ANON_KEY` - Added
- [ ] `SUPABASE_URL` - Added (same as VITE_SUPABASE_URL)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Added
- [ ] `MAILCHIMP_WAITLIST_API_KEY` - Added (your_mailchimp_api_key-us22)
- [ ] `MAILCHIMP_WAITLIST_AUDIENCE_ID` - Added (your_audience_id)
- [ ] `MAILCHIMP_FOUNDERS_API_KEY` - Added (optional)
- [ ] `MAILCHIMP_FOUNDERS_AUDIENCE_ID` - Added (optional)

---

## 🚀 2. Deployment

- [ ] Environment variables saved in Vercel
- [ ] Redeployed application after adding env vars
- [ ] Deployment completed successfully (no errors)
- [ ] Production URL is live

---

## 🧪 3. Test Waitlist Integration

Visit your production landing page:

- [ ] Click "Join Waitlist" button
- [ ] Modal opens with form
- [ ] Fill in: First Name, Last Name, Email
- [ ] Submit form
- [ ] See success message: "You're on the list!"
- [ ] Check Mailchimp Waitlist Audience → New subscriber appears
- [ ] Subscriber has tags: 'Waitlist', 'Landing Page'
- [ ] FNAME and LNAME fields populated correctly

---

## 💳 4. Test Stripe Integration (Test Mode)

### Setup:
- [ ] Using test mode keys (`pk_test_` and `sk_test_`)
- [ ] Have test card ready: `4242 4242 4242 4242`

### Test Flow:
- [ ] Click "Get Early Access" or "Become a Founding Member"
- [ ] Redirects to Stripe Checkout page
- [ ] Stripe checkout page displays correct price ($199/year)
- [ ] Enter test card: `4242 4242 4242 4242`, any future date, any CVC
- [ ] Enter test email and name
- [ ] Complete checkout
- [ ] Redirected back to your app (success page)

### Verify in Systems:
- [ ] **Stripe Dashboard** → Customers → New customer created
- [ ] **Stripe Dashboard** → Subscriptions → Active subscription shows
- [ ] **Supabase** → `subscriptions` table → New row with tier='pro' or 'founder'
- [ ] **Supabase** → `user_profile` table → stripe_customer_id populated
- [ ] **Mailchimp Founders** → New subscriber (if configured)
- [ ] **Mailchimp Founders** → Tags: 'Founders Club', 'Stripe Checkout'

---

## 🔔 5. Test Stripe Webhook

### Verify Webhook is Configured:
- [ ] Go to Stripe Dashboard → Developers → Webhooks
- [ ] Webhook endpoint exists: `https://your-app.vercel.app/api/stripe-webhook`
- [ ] Events selected: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- [ ] Webhook secret copied to Vercel env vars

### Test Webhook:
- [ ] Complete a test checkout (see step 4)
- [ ] Go to Stripe Dashboard → Webhooks → Click your endpoint
- [ ] See recent event: `checkout.session.completed`
- [ ] Event status: ✅ Success (200 response)
- [ ] Click event → View logs → No errors

---

## 📧 6. Test Email Deliverability

### Waitlist:
- [ ] Submit to waitlist with YOUR email
- [ ] Receive welcome email from Mailchimp (if automation set up)
- [ ] Can unsubscribe successfully

### Founders Club:
- [ ] Complete checkout with YOUR email
- [ ] Receive purchase confirmation from Stripe
- [ ] Receive welcome email from Mailchimp (if automation set up)

---

## 🐛 7. Check for Errors

### Browser Console:
- [ ] Open DevTools → Console
- [ ] Navigate landing page → No JavaScript errors
- [ ] Submit waitlist form → No errors
- [ ] All API calls return 200 status

### Vercel Function Logs:
- [ ] Vercel Dashboard → Your Project → Functions
- [ ] Click `subscribe-waitlist` → Check logs
- [ ] See success: "✅ Waitlist signup: ..."
- [ ] Click `stripe-webhook` → Check logs
- [ ] See success: "🎉 Added to Founders Club: ..."
- [ ] No 500 errors, no undefined variable errors

### Stripe Webhook Logs:
- [ ] Stripe Dashboard → Webhooks → Click endpoint
- [ ] All recent events show ✅ Success
- [ ] No failed webhook attempts

---

## 🔒 8. Security Verification

### Browser Check:
- [ ] Open DevTools → Console → Type `import.meta.env`
- [ ] ✅ Can see: `VITE_STRIPE_PUBLISHABLE_KEY` (starts with `pk_`)
- [ ] ❌ Cannot see: `STRIPE_SECRET_KEY` (undefined)
- [ ] ❌ Cannot see: `SUPABASE_SERVICE_ROLE_KEY` (undefined)
- [ ] ❌ Cannot see: `MAILCHIMP_*_API_KEY` (undefined)

### Network Tab:
- [ ] Open DevTools → Network tab
- [ ] Submit waitlist form
- [ ] Check request to `/api/subscribe-waitlist`
- [ ] ❌ No API keys visible in request headers or payload

---

## 📊 9. Data Verification

### Mailchimp Waitlist Audience:
- [ ] Login to Mailchimp
- [ ] Navigate to Audience → View contacts
- [ ] Filter by tag: 'Waitlist'
- [ ] Test subscriber appears
- [ ] FNAME, LNAME, EMAIL populated correctly

### Mailchimp Founders Audience (if configured):
- [ ] Navigate to Founders Club audience
- [ ] Filter by tag: 'Founders Club'
- [ ] Test subscriber appears (after test checkout)
- [ ] Name and email match Stripe checkout

### Supabase Database:
- [ ] Login to Supabase Dashboard
- [ ] Table Editor → `subscriptions`
- [ ] Test subscription appears
- [ ] Fields: `user_id`, `tier`, `status='active'`, `stripe_subscription_id`
- [ ] Table Editor → `user_profile`
- [ ] Test user has `stripe_customer_id` populated

---

## 🎯 10. User Experience

### Landing Page:
- [ ] Page loads quickly (< 3 seconds)
- [ ] All animations work smoothly
- [ ] "Join Waitlist" button clearly visible
- [ ] "Get Early Access" buttons stand out
- [ ] Mobile responsive (test on phone)

### Waitlist Flow:
- [ ] Modal opens smoothly
- [ ] Form is easy to fill
- [ ] Success message is clear
- [ ] Modal closes after success
- [ ] User understands they're on waitlist

### Checkout Flow:
- [ ] Stripe checkout loads fast
- [ ] Price clearly displayed ($199/year)
- [ ] Benefits clearly shown
- [ ] Test card works smoothly
- [ ] Redirect back to app works
- [ ] User knows checkout succeeded

---

## ✅ Final Sign-Off

Before going live with real customers:

- [ ] All tests above passed ✅
- [ ] Switched to Stripe **LIVE MODE** keys (`pk_live_`, `sk_live_`)
- [ ] Updated Stripe webhook to use live mode endpoint
- [ ] Updated all Vercel env vars to production values
- [ ] Redeployed with live credentials
- [ ] Tested one more time with real (small amount) purchase
- [ ] Confirmed refund works (if needed)
- [ ] Ready to launch! 🚀

---

## 🆘 Troubleshooting

### Waitlist submissions not working:
1. Check Vercel function logs for `/api/subscribe-waitlist`
2. Verify Mailchimp API key and Audience ID are correct
3. Test Mailchimp API key permissions
4. Check browser console for errors

### Stripe checkout not working:
1. Verify `VITE_STRIPE_PUBLISHABLE_KEY` in Vercel
2. Check Stripe Dashboard → API keys (test vs live mode)
3. Verify Price IDs match your Stripe products
4. Check browser console for Stripe errors

### Webhook not triggering:
1. Verify webhook URL in Stripe: `https://your-app.vercel.app/api/stripe-webhook`
2. Check `STRIPE_WEBHOOK_SECRET` in Vercel matches Stripe
3. Verify webhook events selected in Stripe
4. Check Vercel function logs for errors
5. Test webhook in Stripe Dashboard → Send test webhook

### Subscribers not appearing in Mailchimp:
1. Check Vercel function logs for success messages
2. Verify Audience IDs are correct
3. Check Mailchimp → Audience → View all contacts (not just subscribed)
4. Check "Archived" contacts (might be re-subscribing)
5. Verify Mailchimp API key has proper permissions

---

**Checklist Status**: 
- [ ] Not Started
- [ ] In Progress
- [ ] ✅ Complete - Ready to Launch!

---

**Last Updated**: January 2026

