-- ============================================================================
-- SUPABASE RLS PERFORMANCE FIXES - COMPREHENSIVE SOLUTION
-- ============================================================================
-- This script fixes all 100 Supabase linter warnings:
-- 1. Auth RLS Initialization Plan warnings (wrap auth functions in SELECT)
-- 2. Multiple Permissive Policies warnings (consolidate overlapping policies)
-- 3. Duplicate Index warnings (remove duplicate indexes)
--
-- Run this ENTIRE file in your Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP ALL EXISTING POLICIES THAT NEED FIXING
-- ============================================================================

-- user_feedback table
DROP POLICY IF EXISTS "Users can insert their own feedback" ON public.user_feedback;
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.user_feedback;
DROP POLICY IF EXISTS "Service can view all feedback" ON public.user_feedback;

-- user_profile table
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profile;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profile;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profile;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.user_profile;

-- social_connections table
DROP POLICY IF EXISTS "Users can manage own social connections" ON public.social_connections;
DROP POLICY IF EXISTS "Service can manage social connections" ON public.social_connections;

-- n8n_post_queue table
DROP POLICY IF EXISTS "Users can manage own post queue" ON public.n8n_post_queue;
DROP POLICY IF EXISTS "Service can manage post queue" ON public.n8n_post_queue;

-- user_publishes table
DROP POLICY IF EXISTS "Users can view own publishes" ON public.user_publishes;
DROP POLICY IF EXISTS "Users can insert own publishes" ON public.user_publishes;
DROP POLICY IF EXISTS "Service can manage all publishes" ON public.user_publishes;

-- scheduled_posts table (drop all to avoid conflicts)
DROP POLICY IF EXISTS "Users can insert own posts" ON public.scheduled_posts;
DROP POLICY IF EXISTS "Users can update own posts" ON public.scheduled_posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON public.scheduled_posts;
DROP POLICY IF EXISTS "Users can view own posts" ON public.scheduled_posts;
DROP POLICY IF EXISTS "Users can manage own posts" ON public.scheduled_posts;

-- users table
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;

-- social_updates table
DROP POLICY IF EXISTS "Service can insert social updates" ON public.social_updates;
DROP POLICY IF EXISTS "Service can update social updates" ON public.social_updates;
DROP POLICY IF EXISTS "Service can delete social updates" ON public.social_updates;
DROP POLICY IF EXISTS "Service can manage social updates" ON public.social_updates;
DROP POLICY IF EXISTS "Anyone can read social updates" ON public.social_updates;

-- user_preferences table
DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;

-- content_library table
DROP POLICY IF EXISTS "Users can view own content library" ON public.content_library;
DROP POLICY IF EXISTS "Users can insert own content library" ON public.content_library;
DROP POLICY IF EXISTS "Users can update own content library" ON public.content_library;
DROP POLICY IF EXISTS "Users can delete own content library" ON public.content_library;

-- projects table
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;

-- ============================================================================
-- STEP 2: CREATE OPTIMIZED POLICIES WITH (select auth.uid()) PATTERN
-- ============================================================================

-- user_feedback table
-- Combine user and service policies to avoid multiple permissive policies
CREATE POLICY "Users can insert their own feedback" ON public.user_feedback
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- Combined policy: users see their own, service role sees all
CREATE POLICY "Users can view their own feedback" ON public.user_feedback
  FOR SELECT USING (
    (select auth.uid()) = user_id 
    OR ((select auth.jwt()) ->> 'role') = 'service_role'
  );

-- user_profile table
CREATE POLICY "Users can view own profile" ON public.user_profile
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own profile" ON public.user_profile
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own profile" ON public.user_profile
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own profile" ON public.user_profile
  FOR DELETE USING ((select auth.uid()) = user_id);

-- social_connections table
-- Combine user and service policies into one to avoid multiple permissive policies
CREATE POLICY "Users can manage own social connections" ON public.social_connections
  FOR ALL USING (
    (select auth.uid()) = user_id 
    OR ((select auth.jwt()) ->> 'role') = 'service_role'
  );

-- n8n_post_queue table
-- Combine user and service policies into one to avoid multiple permissive policies
CREATE POLICY "Users can manage own post queue" ON public.n8n_post_queue
  FOR ALL USING (
    (select auth.uid()) = user_id 
    OR ((select auth.jwt()) ->> 'role') = 'service_role'
  );

-- user_publishes table
-- Combine user and service policies to avoid multiple permissive policies
CREATE POLICY "Users can view own publishes" ON public.user_publishes
  FOR SELECT USING (
    (select auth.uid()) = user_id 
    OR ((select auth.jwt()) ->> 'role') = 'service_role'
  );

CREATE POLICY "Users can insert own publishes" ON public.user_publishes
  FOR INSERT WITH CHECK (
    (select auth.uid()) = user_id 
    OR ((select auth.jwt()) ->> 'role') = 'service_role'
  );

-- scheduled_posts table
-- Use specific policies instead of FOR ALL to avoid conflicts
CREATE POLICY "Users can view own posts" ON public.scheduled_posts
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own posts" ON public.scheduled_posts
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own posts" ON public.scheduled_posts
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own posts" ON public.scheduled_posts
  FOR DELETE USING ((select auth.uid()) = user_id);

-- users table
-- Use single set of policies (not both "profile" and "data")
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING ((select auth.uid()) = id);

-- social_updates table
CREATE POLICY "Anyone can read social updates" ON public.social_updates
  FOR SELECT USING (true);

-- Service can manage social updates (for insert/update/delete)
CREATE POLICY "Service can manage social updates" ON public.social_updates
  FOR ALL USING (((select auth.jwt()) ->> 'role') = 'service_role');

-- user_preferences table
CREATE POLICY "Users can view own preferences" ON public.user_preferences
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own preferences" ON public.user_preferences
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own preferences" ON public.user_preferences
  FOR UPDATE USING ((select auth.uid()) = user_id);

-- content_library table
CREATE POLICY "Users can view own content library" ON public.content_library
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own content library" ON public.content_library
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own content library" ON public.content_library
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own content library" ON public.content_library
  FOR DELETE USING ((select auth.uid()) = user_id);

-- projects table
CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create own projects" ON public.projects
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING ((select auth.uid()) = user_id);

-- ============================================================================
-- STEP 3: FIX DUPLICATE INDEX
-- ============================================================================

-- Drop duplicate index on scheduled_posts
-- Keep idx_scheduled_posts_scheduled_for, remove idx_posts_scheduled
DROP INDEX IF EXISTS public.idx_posts_scheduled;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check that policies are optimized (should show (select auth.uid()) in definitions)
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN qual LIKE '%(select auth.uid())%' OR with_check LIKE '%(select auth.uid())%' THEN 'OPTIMIZED'
    WHEN qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%' THEN 'NEEDS FIX'
    ELSE 'OK'
  END as optimization_status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'user_feedback',
    'user_profile',
    'social_connections',
    'n8n_post_queue',
    'user_publishes',
    'scheduled_posts',
    'users',
    'social_updates',
    'user_preferences',
    'content_library',
    'projects'
  )
ORDER BY tablename, policyname;

-- Check for duplicate indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'scheduled_posts'
  AND indexname LIKE '%scheduled%';

-- Check for multiple permissive policies on same table/role/action
SELECT 
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  permissive
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'n8n_post_queue',
    'scheduled_posts',
    'social_connections',
    'user_feedback',
    'user_publishes',
    'users'
  )
ORDER BY tablename, cmd, policyname;

-- ============================================================================
-- DONE!
-- ============================================================================
-- After running this script:
-- 1. Refresh your Supabase Advisors page
-- 2. All auth_rls_initplan warnings should be resolved
-- 3. All multiple_permissive_policies warnings should be resolved
-- 4. The duplicate_index warning should be resolved
-- 5. Run the verification queries above to confirm
-- ============================================================================

