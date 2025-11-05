-- Content Library Integration - Database Schema
-- Run this SQL in your Supabase SQL Editor to set up the content library feature

-- ============================================================================
-- 1. Add storage tracking column to users table
-- ============================================================================

-- Add storage_used_bytes column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'storage_used_bytes'
  ) THEN
    ALTER TABLE public.users ADD COLUMN storage_used_bytes BIGINT DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- 2. Create content_library table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.content_library (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'text')),
  storage_path TEXT, -- Path in Supabase Storage (for private bucket files)
  url TEXT, -- External URL or old public URL (nullable, deprecated for new uploads)
  content TEXT, -- Text content (for type='text')
  size_bytes BIGINT DEFAULT 0 NOT NULL, -- File size in bytes (0 for text content)
  project_id TEXT, -- Project/folder identifier (nullable)
  description TEXT, -- Optional description
  metadata JSONB, -- Additional metadata (compression info, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_library_user_id ON public.content_library(user_id);
CREATE INDEX IF NOT EXISTS idx_content_library_type ON public.content_library(type);
CREATE INDEX IF NOT EXISTS idx_content_library_project_id ON public.content_library(project_id);
CREATE INDEX IF NOT EXISTS idx_content_library_created_at ON public.content_library(created_at DESC);

-- ============================================================================
-- 3. Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.content_library ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own content library items
CREATE POLICY "Users can view own content library" ON public.content_library
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own content library items
CREATE POLICY "Users can insert own content library" ON public.content_library
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own content library items
CREATE POLICY "Users can update own content library" ON public.content_library
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own content library items
CREATE POLICY "Users can delete own content library" ON public.content_library
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 4. Create trigger function to update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_content_library_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_content_library_timestamp
  BEFORE UPDATE ON public.content_library
  FOR EACH ROW
  EXECUTE FUNCTION update_content_library_updated_at();

-- ============================================================================
-- 5. Create trigger function to track storage usage
-- ============================================================================

-- Function to update user's storage_used_bytes when content is added
CREATE OR REPLACE FUNCTION update_storage_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Only count storage for files (images/videos), not text content
  IF NEW.type != 'text' AND NEW.size_bytes > 0 THEN
    UPDATE public.users
    SET storage_used_bytes = COALESCE(storage_used_bytes, 0) + NEW.size_bytes
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update user's storage_used_bytes when content is deleted
CREATE OR REPLACE FUNCTION update_storage_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Only subtract storage for files (images/videos), not text content
  IF OLD.type != 'text' AND OLD.size_bytes > 0 THEN
    UPDATE public.users
    SET storage_used_bytes = GREATEST(COALESCE(storage_used_bytes, 0) - OLD.size_bytes, 0)
    WHERE id = OLD.user_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Function to update user's storage_used_bytes when content size changes
CREATE OR REPLACE FUNCTION update_storage_on_update()
RETURNS TRIGGER AS $$
DECLARE
  size_diff BIGINT;
BEGIN
  -- Only track storage changes for files (images/videos), not text content
  IF OLD.type != 'text' AND NEW.type != 'text' THEN
    -- Calculate the difference in size
    size_diff := NEW.size_bytes - COALESCE(OLD.size_bytes, 0);
    
    IF size_diff != 0 THEN
      UPDATE public.users
      SET storage_used_bytes = GREATEST(COALESCE(storage_used_bytes, 0) + size_diff, 0)
      WHERE id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_storage_on_insert ON public.content_library;
CREATE TRIGGER trigger_update_storage_on_insert
  AFTER INSERT ON public.content_library
  FOR EACH ROW
  EXECUTE FUNCTION update_storage_on_insert();

DROP TRIGGER IF EXISTS trigger_update_storage_on_delete ON public.content_library;
CREATE TRIGGER trigger_update_storage_on_delete
  AFTER DELETE ON public.content_library
  FOR EACH ROW
  EXECUTE FUNCTION update_storage_on_delete();

DROP TRIGGER IF EXISTS trigger_update_storage_on_update ON public.content_library;
CREATE TRIGGER trigger_update_storage_on_update
  AFTER UPDATE OF size_bytes ON public.content_library
  FOR EACH ROW
  WHEN (OLD.size_bytes IS DISTINCT FROM NEW.size_bytes)
  EXECUTE FUNCTION update_storage_on_update();

-- ============================================================================
-- 6. Optional: Initialize storage_used_bytes for existing users
-- ============================================================================

-- Calculate and set storage_used_bytes for all existing users based on their content
UPDATE public.users u
SET storage_used_bytes = COALESCE((
  SELECT SUM(size_bytes)
  FROM public.content_library cl
  WHERE cl.user_id = u.id
    AND cl.type != 'text'
), 0)
WHERE EXISTS (
  SELECT 1 FROM public.content_library cl WHERE cl.user_id = u.id
);

-- ============================================================================
-- 7. Add helpful comments
-- ============================================================================

COMMENT ON TABLE public.content_library IS 'Stores user-uploaded content (images, videos, text) with storage tracking';
COMMENT ON COLUMN public.content_library.storage_path IS 'Path in Supabase Storage bucket for private file access';
COMMENT ON COLUMN public.content_library.size_bytes IS 'File size in bytes (0 for text content, does not count toward storage limit)';
COMMENT ON COLUMN public.content_library.project_id IS 'Optional project/folder identifier for organizing content';
COMMENT ON COLUMN public.users.storage_used_bytes IS 'Total storage used in bytes, automatically updated by triggers';

