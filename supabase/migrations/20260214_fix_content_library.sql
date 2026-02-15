-- ============================================================================
-- Fix: Content Library — Upload broken
-- 
-- This migration fixes all known issues preventing Content Library uploads:
-- 1. FK constraint pointing to public.users instead of auth.users
-- 2. Missing or incorrect RLS policies on content_library table
-- 3. Missing or incorrect RLS policies on projects table
-- 4. Storage trigger functions referencing wrong schema
--
-- IMPORTANT: You also need to create the "content-library" storage bucket
-- in Supabase Dashboard → Storage → New Bucket:
--   Name: content-library
--   Public: OFF (private bucket)
--   File size limit: 50MB
--   Allowed MIME types: image/*, video/*
-- ============================================================================

-- ============================================================================
-- Step 1: Fix foreign key constraints — point to auth.users instead of public.users
-- ============================================================================

-- Fix content_library FK
ALTER TABLE public.content_library 
DROP CONSTRAINT IF EXISTS content_library_user_id_fkey;

ALTER TABLE public.content_library
ADD CONSTRAINT content_library_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Fix projects FK
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'projects') THEN
    ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_user_id_fkey;
    ALTER TABLE public.projects
    ADD CONSTRAINT projects_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- Step 2: Ensure RLS is enabled and policies are correct on content_library
-- ============================================================================

ALTER TABLE public.content_library ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies (safe re-run)
DROP POLICY IF EXISTS "Users can view own content library" ON public.content_library;
DROP POLICY IF EXISTS "Users can insert own content library" ON public.content_library;
DROP POLICY IF EXISTS "Users can update own content library" ON public.content_library;
DROP POLICY IF EXISTS "Users can delete own content library" ON public.content_library;

CREATE POLICY "Users can view own content library" ON public.content_library
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own content library" ON public.content_library
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own content library" ON public.content_library
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own content library" ON public.content_library
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- Step 3: Ensure RLS is enabled and policies are correct on projects
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'projects') THEN
    ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
    DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
    DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
    DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
    
    CREATE POLICY "Users can view own projects" ON public.projects
      FOR SELECT TO authenticated
      USING ((SELECT auth.uid()) = user_id);
    
    CREATE POLICY "Users can insert own projects" ON public.projects
      FOR INSERT TO authenticated
      WITH CHECK ((SELECT auth.uid()) = user_id);
    
    CREATE POLICY "Users can update own projects" ON public.projects
      FOR UPDATE TO authenticated
      USING ((SELECT auth.uid()) = user_id);
    
    CREATE POLICY "Users can delete own projects" ON public.projects
      FOR DELETE TO authenticated
      USING ((SELECT auth.uid()) = user_id);
  END IF;
END $$;

-- ============================================================================
-- Step 4: Create Storage RLS policies on storage.objects
-- These allow authenticated users to upload/read/update/delete files in their own folder
-- Run AFTER creating the "content-library" bucket in Dashboard → Storage
-- ============================================================================

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'content-library'
  AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to view their own files
CREATE POLICY "Users can view own files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'content-library'
  AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'content-library'
  AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'content-library'
  AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
);
