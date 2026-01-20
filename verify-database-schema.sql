-- Database Schema Verification Script
-- Run this in Supabase SQL Editor to check if all required tables and columns exist
-- This helps diagnose onboarding and other database-related issues

-- ============================================================================
-- 1. Check if user_profile table exists
-- ============================================================================
DO $$ 
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profile'
  ) THEN
    RAISE NOTICE '✅ user_profile table EXISTS';
  ELSE
    RAISE NOTICE '❌ user_profile table DOES NOT EXIST - Run docs/setup/supabase-user-profile-schema.sql';
  END IF;
END $$;

-- ============================================================================
-- 2. List all columns in user_profile (if it exists)
-- ============================================================================
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_profile'
ORDER BY ordinal_position;

-- ============================================================================
-- 3. Check for specific required columns
-- ============================================================================
DO $$ 
DECLARE
  missing_columns TEXT[] := ARRAY[]::TEXT[];
  col TEXT;
  required_columns TEXT[] := ARRAY[
    'content_strengths',
    'biggest_challenge',
    'hook_style_preference',
    'emotional_triggers',
    'profile_type',
    'creator_archetype',
    'brand_name',
    'industry',
    'niche',
    'target_audience',
    'content_goals',
    'posting_frequency',
    'preferred_platforms',
    'brand_voice_preference',
    'quiz_completed_at'
  ];
BEGIN
  -- Only check if table exists
  IF EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profile'
  ) THEN
    -- Check each required column
    FOREACH col IN ARRAY required_columns
    LOOP
      IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'user_profile' 
          AND column_name = col
      ) THEN
        missing_columns := array_append(missing_columns, col);
      END IF;
    END LOOP;
    
    -- Report results
    IF array_length(missing_columns, 1) IS NULL THEN
      RAISE NOTICE '✅ All required columns exist in user_profile';
    ELSE
      RAISE NOTICE '❌ Missing columns in user_profile: %', array_to_string(missing_columns, ', ');
      RAISE NOTICE '   Run: supabase/migrations/add_viral_content_fields.sql';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 4. Check RLS policies on user_profile
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'user_profile'
ORDER BY policyname;

-- ============================================================================
-- 5. Check other important tables
-- ============================================================================
DO $$ 
DECLARE
  tables TEXT[] := ARRAY[
    'users',
    'user_profile',
    'subscriptions',
    'scheduled_posts',
    'content_library',
    'projects',
    'social_connections',
    'n8n_post_queue',
    'generated_content',
    'user_activity'
  ];
  tbl TEXT;
  exists_count INT := 0;
  missing_tables TEXT[] := ARRAY[]::TEXT[];
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Checking all required tables ===';
  
  FOREACH tbl IN ARRAY tables
  LOOP
    IF EXISTS (
      SELECT FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = tbl
    ) THEN
      RAISE NOTICE '✅ % exists', tbl;
      exists_count := exists_count + 1;
    ELSE
      RAISE NOTICE '❌ % MISSING', tbl;
      missing_tables := array_append(missing_tables, tbl);
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== Summary ===';
  RAISE NOTICE 'Tables found: % / %', exists_count, array_length(tables, 1);
  
  IF array_length(missing_tables, 1) IS NOT NULL THEN
    RAISE NOTICE 'Missing tables: %', array_to_string(missing_tables, ', ');
    RAISE NOTICE 'Check docs/setup/ for SQL schema files to create these tables';
  ELSE
    RAISE NOTICE '✅ All core tables exist!';
  END IF;
END $$;

-- ============================================================================
-- 6. Final recommendation
-- ============================================================================
DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Next Steps ===';
  RAISE NOTICE 'If you see missing columns or tables above:';
  RAISE NOTICE '1. For user_profile columns: Run supabase/migrations/add_viral_content_fields.sql';
  RAISE NOTICE '2. For missing tables: Check docs/setup/ folder for the corresponding schema files';
  RAISE NOTICE '3. After running migrations, refresh your app and try the onboarding quiz again';
  RAISE NOTICE '';
  RAISE NOTICE 'For detailed help, see: FIX-ONBOARDING-SCHEMA.md';
END $$;

