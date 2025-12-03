# Supabase RLS Performance Fixes

This document explains how to fix all 100 Supabase linter warnings related to RLS (Row Level Security) performance issues.

## Issues Fixed

1. **Auth RLS Initialization Plan (auth_rls_initplan)** - 33 warnings
   - Problem: `auth.uid()` and `auth.jwt()` calls are re-evaluated for each row
   - Solution: Wrap auth functions in `(select auth.uid())` to cache the result

2. **Multiple Permissive Policies** - 66 warnings
   - Problem: Multiple permissive policies for the same role/action cause performance overhead
   - Solution: Combine overlapping policies using OR conditions

3. **Duplicate Index** - 1 warning
   - Problem: Two identical indexes on `scheduled_posts` table
   - Solution: Remove the duplicate index

## How to Apply the Fix

1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Open the file `docs/setup/SUPABASE-RLS-PERFORMANCE-FIX.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click "Run" to execute
7. Wait for completion (should take a few seconds)
8. Refresh your Supabase Advisors page to verify warnings are gone

## What the Script Does

### Step 1: Drops All Existing Policies
- Safely drops all policies that need optimization
- Uses `DROP POLICY IF EXISTS` so it won't fail if policies don't exist

### Step 2: Creates Optimized Policies
- Wraps all `auth.uid()` calls in `(select auth.uid())`
- Wraps all `auth.jwt()` calls in `(select auth.jwt())`
- Combines overlapping policies to avoid multiple permissive policies

### Step 3: Removes Duplicate Index
- Drops `idx_posts_scheduled` (keeps `idx_scheduled_posts_scheduled_for`)

## Key Changes

### Before (Inefficient):
```sql
CREATE POLICY "Users can view own posts" ON public.scheduled_posts
  FOR SELECT USING (auth.uid() = user_id);
```

### After (Optimized):
```sql
CREATE POLICY "Users can view own posts" ON public.scheduled_posts
  FOR SELECT USING ((select auth.uid()) = user_id);
```

### Multiple Policies Combined:
**Before:**
```sql
CREATE POLICY "Users can manage own social connections" ON public.social_connections
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service can manage social connections" ON public.social_connections
  FOR ALL USING (true);
```

**After:**
```sql
CREATE POLICY "Users can manage own social connections" ON public.social_connections
  FOR ALL USING (
    (select auth.uid()) = user_id 
    OR ((select auth.jwt()) ->> 'role') = 'service_role'
  );
```

## Verification

After running the script, run these queries to verify:

```sql
-- Check that policies are optimized
SELECT 
  schemaname,
  tablename,
  policyname,
  CASE 
    WHEN qual LIKE '%(select auth.uid())%' OR with_check LIKE '%(select auth.uid())%' THEN 'OPTIMIZED'
    WHEN qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%' THEN 'NEEDS FIX'
    ELSE 'OK'
  END as optimization_status
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check for duplicate indexes
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'scheduled_posts'
  AND indexname LIKE '%scheduled%';
```

## Tables Affected

- `user_feedback`
- `user_profile`
- `social_connections`
- `n8n_post_queue`
- `user_publishes`
- `scheduled_posts`
- `users`
- `social_updates`
- `user_preferences`
- `content_library`
- `projects`

## Important Notes

1. **Service Role Policies**: The script combines service role policies with user policies using OR conditions. This is more efficient than having separate policies.

2. **No Data Loss**: This script only modifies policies and indexes. No data is affected.

3. **Backward Compatible**: The optimized policies maintain the same security behavior, just with better performance.

4. **Idempotent**: You can run this script multiple times safely. It uses `DROP POLICY IF EXISTS` and `DROP INDEX IF EXISTS`.

## Troubleshooting

If warnings persist after running the script:

1. Check that the script ran without errors
2. Verify policies were created: `SELECT * FROM pg_policies WHERE schemaname = 'public';`
3. Check for any policies that weren't dropped (might have different names)
4. Refresh the Supabase Advisors page (sometimes takes a few minutes to update)

## Performance Impact

After applying these fixes:
- Query performance should improve, especially for tables with many rows
- Auth function calls are cached per query instead of per row
- Fewer policy evaluations per query
- Reduced database load

## References

- [Supabase RLS Performance Guide](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select)
- [Supabase Database Linter](https://supabase.com/docs/guides/database/database-linter)

