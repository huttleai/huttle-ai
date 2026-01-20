-- FIX: Content Library Foreign Key Issue
-- ========================================
-- 
-- PROBLEM: The content_library table references public.users(id) but users are stored in auth.users
-- This causes foreign key constraint violations when trying to save content.
--
-- SOLUTION: Change the foreign key to reference auth.users(id) instead
--
-- Run this SQL in your Supabase SQL Editor to fix the issue.

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE public.content_library 
DROP CONSTRAINT IF EXISTS content_library_user_id_fkey;

-- Step 2: Add the correct foreign key constraint referencing auth.users
ALTER TABLE public.content_library
ADD CONSTRAINT content_library_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Step 3: Verify the fix
-- Run this to confirm the constraint is correct:
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'content_library' 
    AND tc.constraint_type = 'FOREIGN KEY';

-- Expected output should show:
-- foreign_table_schema: auth
-- foreign_table_name: users
-- foreign_column_name: id

-- ========================================
-- ALSO FIX: Other tables with the same issue
-- ========================================

-- Fix projects table
ALTER TABLE public.projects 
DROP CONSTRAINT IF EXISTS projects_user_id_fkey;

ALTER TABLE public.projects
ADD CONSTRAINT projects_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Fix scheduled_posts table (if it references public.users)
ALTER TABLE public.scheduled_posts 
DROP CONSTRAINT IF EXISTS scheduled_posts_user_id_fkey;

ALTER TABLE public.scheduled_posts
ADD CONSTRAINT scheduled_posts_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Fix user_preferences table
ALTER TABLE public.user_preferences 
DROP CONSTRAINT IF EXISTS user_preferences_user_id_fkey;

ALTER TABLE public.user_preferences
ADD CONSTRAINT user_preferences_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- ========================================
-- ALTERNATIVE: If you prefer to keep public.users table
-- ========================================
-- If you have a public.users table that you want to keep in sync with auth.users,
-- you can create a trigger to automatically create a public.users record when
-- a new auth.users record is created:
--
-- CREATE OR REPLACE FUNCTION public.handle_new_user() 
-- RETURNS TRIGGER 
-- LANGUAGE plpgsql 
-- SECURITY DEFINER 
-- SET search_path = public
-- AS $$
-- BEGIN
--   INSERT INTO public.users (id, email, created_at)
--   VALUES (NEW.id, NEW.email, NOW())
--   ON CONFLICT (id) DO NOTHING;
--   RETURN NEW;
-- END;
-- $$;
--
-- CREATE OR REPLACE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION public.handle_new_user();

