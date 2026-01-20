# Stripe Debug - Quick Reference

## ✅ What I Fixed

1. **Added debug logging** to `src/services/stripeAPI.js`
2. **Confirmed correct Vite syntax** - already using `import.meta.env` (not `process.env`)
3. **Added console.log** showing: `"Stripe Key Loaded:", import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY`

## 🧪 Test Now

1. **Restart dev server** (if it's running):
   ```bash
   # Press Ctrl+C to stop, then:
   npm run dev
   ```

2. **Open browser console** (F12 or Cmd+Option+I)

3. **Go to Subscription page** and click "Upgrade"

4. **Look for these logs** in console:
   ```
   🔵 Stripe Key Loaded: pk_test_...
   🔵 Creating checkout session for plan: essentials
   🔵 Price ID: price_...
   🔵 Is Demo Mode: false
   🔵 Calling API: /api/create-checkout-session
   🔵 Response status: 200
   ✅ Checkout session created: {...}
   🔵 Redirecting to Stripe Checkout: https://...
   ```

## 🚨 Common Issues

### If you see: `🔵 Stripe Key Loaded: undefined`
**Fix:** Add to `.env` file:
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
```
Then restart server!

### If you see: `🔵 Is Demo Mode: true`
**Fix:** Add to `.env` file:
```bash
VITE_STRIPE_PRICE_ESSENTIALS_MONTHLY=price_xxxxxxxxxxxxx
VITE_STRIPE_PRICE_PRO_MONTHLY=price_yyyyyyyyyyyyy
```
Then restart server!

### If you see: `❌ API Error: 404`
**Fix:** Backend not running. Try:
```bash
vercel dev
# or
npm run dev:local
```

### If you see: `❌ API Error: 500` or "Stripe configuration error"
**Fix:** Backend env vars missing. Need:
- `STRIPE_SECRET_KEY=sk_test_...`
- `VITE_APP_URL=http://localhost:5173`
- `SUPABASE_URL=...`
- `SUPABASE_SERVICE_ROLE_KEY=...`

## 📋 Required Environment Variables

### Frontend (`.env` file)
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
VITE_STRIPE_PRICE_ESSENTIALS_MONTHLY=price_xxxxxxxxxxxxx
VITE_STRIPE_PRICE_PRO_MONTHLY=price_yyyyyyyyyyyyy
```

### Backend (Vercel or local API server)
```bash
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
VITE_APP_URL=http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 💡 Key Points

- ✅ Code now uses `import.meta.env` (correct for Vite)
- ✅ Added comprehensive logging for debugging
- ✅ Console will show exactly where it fails
- ⚠️ Must restart server after changing `.env`
- ⚠️ Environment variables must start with `VITE_` for frontend

## 📖 Full Details

See `STRIPE-FIX-SUMMARY.md` for complete documentation.



