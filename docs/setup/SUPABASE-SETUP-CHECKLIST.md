# Supabase Setup Checklist for Huttle AI

This document lists all the SQL scripts that **MUST** be run in your Supabase SQL Editor for Huttle AI to work properly.

## Quick Start

If you're seeing "Checking your profile..." stuck loading, or features like Content Library and Smart Calendar aren't working, you need to run these SQL scripts.

## Prerequisites

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from Settings > API
3. Add them to your `.env` file:
   ```
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

---

## Required SQL Scripts (Run in Order)

### Step 1: Create User Profile Table

**File:** `docs/setup/supabase-user-profile-schema.sql`

**Purpose:** Creates the `user_profile` table which stores onboarding quiz data and user preferences.

**Critical for:**
- User login/signup flow
- Onboarding quiz
- Brand Voice settings
- AI personalization

**Run this SQL:**
```sql
-- Copy and paste the contents of docs/setup/supabase-user-profile-schema.sql
```

### Step 2: Apply RLS Performance Fixes

**File:** `docs/setup/SUPABASE-RLS-PERFORMANCE-FIX.sql`

**Purpose:** Sets up Row Level Security (RLS) policies with optimized `(select auth.uid())` pattern for better performance.

**Critical for:**
- All authenticated database queries
- Preventing unauthorized data access
- Query performance

**Run this SQL:**
```sql
-- Copy and paste the contents of docs/setup/SUPABASE-RLS-PERFORMANCE-FIX.sql
```

### Step 3: Fix Foreign Key Constraints

**File:** `docs/setup/FIX-CONTENT-LIBRARY-FK.sql`

**Purpose:** Fixes foreign key constraints to reference `auth.users(id)` instead of `public.users(id)`.

**Critical for:**
- Content Library (saving/loading content)
- Smart Calendar (scheduled posts)
- User preferences
- Projects

**Run this SQL:**
```sql
-- Copy and paste the contents of docs/setup/FIX-CONTENT-LIBRARY-FK.sql
```

### Step 4: Stripe Integration (Optional)

**File:** `docs/setup/supabase-stripe-schema.sql`

**Purpose:** Adds Stripe customer ID to user profile and creates subscriptions table.

**Critical for:**
- Subscription management
- Payment processing
- Tier-based feature access

**Run this SQL:**
```sql
-- Copy and paste the contents of docs/setup/supabase-stripe-schema.sql
```

---

## Verification

After running all scripts, verify your setup:

### 1. Check Tables Exist

Run this in Supabase SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'user_profile',
  'content_library',
  'scheduled_posts',
  'user_preferences',
  'projects',
  'subscriptions'
);
```

You should see all these tables listed.

### 2. Check RLS is Enabled

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_profile', 'content_library', 'scheduled_posts');
```

All should show `rowsecurity = true`.

### 3. Check Foreign Keys

```sql
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('content_library', 'scheduled_posts', 'user_preferences', 'projects')
  AND kcu.column_name = 'user_id';
```

All should show `foreign_table_schema = 'auth'` and `foreign_table_name = 'users'`.

---

## Troubleshooting

### "Checking your profile..." stuck loading

**Cause:** The `user_profile` table doesn't exist or RLS policies are blocking queries.

**Fix:** Run Steps 1 and 2 above.

### Content Library won't save

**Cause:** Foreign key constraint references wrong table (`public.users` instead of `auth.users`).

**Fix:** Run Step 3 above.

### Smart Calendar is blank

**Cause:** Same as Content Library - foreign key issue with `scheduled_posts` table.

**Fix:** Run Step 3 above.

### Console shows "42P01" error

**Cause:** Table doesn't exist.

**Fix:** Run the appropriate schema creation script.

### Console shows timeout errors

**Cause:** RLS policies may be misconfigured or tables don't exist.

**Fix:** Run Steps 1-3 above.

---

## Storage Buckets

You also need to create a storage bucket for user uploads:

1. Go to Supabase Dashboard > Storage
2. Create a new bucket called `content-library`
3. Set it to **Private** (not public)
4. Add these RLS policies:

```sql
-- Allow users to upload to their own folder
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'content-library' 
  AND (select auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow users to read their own files
CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'content-library' 
  AND (select auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'content-library' 
  AND (select auth.uid())::text = (storage.foldername(name))[1]
);
```

---

## Complete Setup Order

1. Create Supabase project
2. Add environment variables to `.env`
3. Run `supabase-user-profile-schema.sql`
4. Run `SUPABASE-RLS-PERFORMANCE-FIX.sql`
5. Run `FIX-CONTENT-LIBRARY-FK.sql`
6. (Optional) Run `supabase-stripe-schema.sql`
7. Create `content-library` storage bucket
8. Test by signing up/logging in

Your Huttle AI app should now be fully functional!

