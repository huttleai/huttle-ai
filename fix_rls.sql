-- Fix RLS Policies for Users Table
-- This fixes the 409 Conflict and 406 errors during onboarding
-- 
-- Issue: Backend trigger creates user row, but frontend needs to UPDATE it
-- Solution: Ensure proper RLS policies for INSERT and UPDATE operations

-- Enable RLS (if not already enabled)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own data" ON public.users;

-- Allow Users to View their own data
CREATE POLICY "Users can view own data" 
ON public.users FOR SELECT 
USING ((select auth.uid()) = id);

-- Allow Users to Update their own data
-- This fixes the 406 error when trying to update profile during onboarding
CREATE POLICY "Users can update own profile" 
ON public.users FOR UPDATE 
USING ((select auth.uid()) = id)
WITH CHECK ((select auth.uid()) = id);

-- Allow Users to Insert their own profile
-- This handles cases where the trigger hasn't created the row yet
CREATE POLICY "Users can insert own profile" 
ON public.users FOR INSERT 
WITH CHECK ((select auth.uid()) = id);

-- Note: The backend trigger should create the user row automatically
-- But these policies ensure the frontend can update it if needed
-- The frontend should use UPSERT to handle both cases gracefully


