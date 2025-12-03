-- ============================================================================
-- SUPABASE RLS (ROW LEVEL SECURITY) FIX
-- ============================================================================
-- This file fixes the "Policy Exists RLS Disabled" and "RLS Disabled in Public" errors
-- Run this ENTIRE file in your Supabase SQL Editor
--
-- Issue: Tables have policies defined but RLS is not enabled on the tables themselves
-- Fix: Enable RLS on all affected tables
-- ============================================================================

-- ============================================================================
-- ENABLE RLS ON ALL AFFECTED TABLES
-- ============================================================================

-- Enable RLS on content_library
ALTER TABLE public.content_library ENABLE ROW LEVEL SECURITY;

-- Enable RLS on generated_content
ALTER TABLE public.generated_content ENABLE ROW LEVEL SECURITY;

-- Enable RLS on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Enable RLS on subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on user_activity
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- Enable RLS on user_preferences (if exists)
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running this, verify RLS is enabled on all tables:

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'content_library',
    'generated_content',
    'projects',
    'subscriptions',
    'user_activity',
    'user_preferences'
  )
ORDER BY tablename;

-- Expected result: All tables should show rls_enabled = true

-- ============================================================================
-- VERIFY POLICIES ARE STILL IN PLACE
-- ============================================================================
-- Check that all policies still exist after enabling RLS:

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'content_library',
    'generated_content',
    'projects',
    'subscriptions',
    'user_activity',
    'user_preferences'
  )
ORDER BY tablename, policyname;

-- You should see multiple policies for each table

-- ============================================================================
-- DONE!
-- ============================================================================
-- After running this file:
-- 1. Refresh your Supabase Advisors page
-- 2. All "Policy Exists RLS Disabled" errors should be resolved
-- 3. All "RLS Disabled in Public" errors should be resolved
-- 4. You should go from 12 errors to 0 errors! 🎉
-- ============================================================================

