# 🔧 Troubleshooting Index

Quick reference guide for common issues and their solutions.

---

## 🚨 Common Errors

### Onboarding & Database Issues

#### "Could not find the 'content_strengths' column of 'user_profile' in the schema cache"
**Solution:** Missing database columns. See **[FIX-ONBOARDING-SCHEMA.md](./FIX-ONBOARDING-SCHEMA.md)**

**Quick Fix:**
1. Go to Supabase SQL Editor
2. Run the migration from `supabase/migrations/add_viral_content_fields.sql`
3. Refresh your app

#### "relation 'public.user_profile' does not exist"
**Solution:** The user_profile table hasn't been created yet.

**Fix:**
1. Go to Supabase SQL Editor
2. Run the complete schema from `docs/setup/supabase-user-profile-schema.sql`
3. Refresh your app

#### Can't complete onboarding / Quiz won't save
**Solution:** Check your database schema.

**Fix:**
1. Run the verification script: `verify-database-schema.sql`
2. Follow the recommendations in the output
3. See **[FIX-ONBOARDING-SCHEMA.md](./FIX-ONBOARDING-SCHEMA.md)** for detailed steps

---

### Stripe & Payment Issues

#### Checkout not working / Stripe errors
**Solution:** See **[STRIPE-CHECKOUT-FIX.md](./STRIPE-CHECKOUT-FIX.md)**

#### Quick checkout debugging
**Solution:** See **[QUICK-CHECKOUT-DEBUG.md](./QUICK-CHECKOUT-DEBUG.md)**

#### Stripe webhook issues
**Solution:** See **[STRIPE-DEBUG-QUICK-REFERENCE.md](./STRIPE-DEBUG-QUICK-REFERENCE.md)**

#### Subscription downgrade issues
**Solution:** See **[DOWNGRADE-FIX.md](./DOWNGRADE-FIX.md)**

---

### Waitlist & Email Issues

#### Waitlist signup not working
**Solution:** See **[WAITLIST-FIX-COMPLETE.md](./WAITLIST-FIX-COMPLETE.md)**

#### Debugging waitlist connections
**Solution:** See **[WAITLIST-DEBUG-GUIDE.md](./WAITLIST-DEBUG-GUIDE.md)**

---

### Deployment Issues

#### Vercel deployment problems
**Solution:** See **[PRODUCTION-DEPLOYMENT-GUIDE.md](./PRODUCTION-DEPLOYMENT-GUIDE.md)**

#### GitHub deployment checklist
**Solution:** See **[GITHUB-DEPLOYMENT-CHECKLIST.md](./GITHUB-DEPLOYMENT-CHECKLIST.md)**

#### Environment variables on Vercel
**Solution:** See **[check-env-vercel.md](./check-env-vercel.md)**

---

## 🔍 Diagnostic Tools

### Database Schema Verification
**File:** `verify-database-schema.sql`

Run this in Supabase SQL Editor to check:
- Which tables exist
- Which columns are missing
- RLS policies status
- Recommendations for fixes

### Test API Connections
**File:** `test-api.sh`

Run this to test your API endpoints locally.

### Test Waitlist Connection
**File:** `test-waitlist-connection.js`

Run this to verify Mailchimp/waitlist integration.

---

## 📚 Setup Guides

### Initial Setup
- **[START-HERE.md](./START-HERE.md)** - Main getting started guide
- **[LOCAL-DEV-SETUP.md](./LOCAL-DEV-SETUP.md)** - Local development setup
- **[WHATS-NEXT.md](./WHATS-NEXT.md)** - Next steps after initial setup

### Database Setup
- **[docs/setup/supabase-user-profile-schema.sql](./docs/setup/supabase-user-profile-schema.sql)** - User profile table
- **[docs/setup/SUPABASE-N8N-SETUP.md](./docs/setup/SUPABASE-N8N-SETUP.md)** - Complete database setup
- **[docs/setup/CONTENT-LIBRARY-SETUP.md](./docs/setup/CONTENT-LIBRARY-SETUP.md)** - Content library setup

### Feature Setup
- **[N8N-SETUP-COMPLETE.md](./N8N-SETUP-COMPLETE.md)** - n8n workflow setup
- **[FOUNDERS-CLUB-SETUP-COMPLETE.md](./FOUNDERS-CLUB-SETUP-COMPLETE.md)** - Founders Club feature
- **[WEBHOOK-INTEGRATION-COMPLETE.md](./WEBHOOK-INTEGRATION-COMPLETE.md)** - Webhook setup

---

## 🆘 Still Having Issues?

### Check These First

1. **Environment Variables**
   - Verify `.env` file exists and has correct values
   - Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   - Ensure no trailing slashes in URLs

2. **Database Connection**
   - Run `verify-database-schema.sql` to check your database
   - Verify RLS policies are enabled
   - Check that all required tables exist

3. **Browser Console**
   - Open browser DevTools (F12)
   - Check Console tab for error messages
   - Check Network tab for failed API calls

4. **Supabase Logs**
   - Go to Supabase Dashboard → Logs
   - Check for error messages
   - Look for RLS policy violations

### Common Fixes

#### Clear Cache & Refresh
Many issues are resolved by:
1. Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
2. Clear browser cache
3. Restart development server

#### Restart Development Server
```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

#### Check Node Modules
```bash
# Delete and reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## 📖 Documentation Structure

```
/
├── FIX-*.md                    # Specific problem fixes
├── *-DEBUG-*.md                # Debugging guides
├── *-SETUP-*.md                # Setup instructions
├── docs/
│   ├── setup/                  # Database schemas & setup
│   ├── guides/                 # Feature guides
│   └── implementation/         # Implementation details
├── supabase/
│   └── migrations/             # Database migrations
└── verify-database-schema.sql  # Database diagnostic tool
```

---

## 🎯 Quick Links by Issue Type

| Issue Type | First Check | Main Guide |
|------------|-------------|------------|
| Onboarding won't complete | Database schema | [FIX-ONBOARDING-SCHEMA.md](./FIX-ONBOARDING-SCHEMA.md) |
| Stripe checkout fails | Environment variables | [STRIPE-CHECKOUT-FIX.md](./STRIPE-CHECKOUT-FIX.md) |
| Waitlist signup fails | API connection | [WAITLIST-DEBUG-GUIDE.md](./WAITLIST-DEBUG-GUIDE.md) |
| Deployment fails | Vercel settings | [PRODUCTION-DEPLOYMENT-GUIDE.md](./PRODUCTION-DEPLOYMENT-GUIDE.md) |
| Database errors | Run verification | `verify-database-schema.sql` |
| API errors | Check console | Browser DevTools (F12) |

---

## 💡 Pro Tips

1. **Always check the browser console first** - Most errors show detailed messages there
2. **Run the verification script** - `verify-database-schema.sql` catches most database issues
3. **Check environment variables** - Many issues are just missing or incorrect env vars
4. **Read the error message carefully** - They usually tell you exactly what's wrong
5. **Search this file** - Use `Cmd+F` / `Ctrl+F` to search for your error message

---

Need more help? Check the specific guide for your issue above! 🚀

