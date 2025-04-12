/*
  # Fix school_members table and RLS policies

  1. Changes
    - Create school_members table if it doesn't exist
    - Create helper functions for admin checks
    - Set up correct RLS policies with unique names
    - Fix infinite recursion issues in policies
  
  2. Security
    - Enable RLS on the table
    - Proper policies for users and admins
    - Security functions to simplify policy logic
*/

-- First ensure school_members table exists
CREATE TABLE IF NOT EXISTS public.school_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'member')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(school_id, user_id)
);

-- Create indexes to improve performance
CREATE INDEX IF NOT EXISTS idx_school_members_school_id ON public.school_members(school_id);
CREATE INDEX IF NOT EXISTS idx_school_members_user_id ON public.school_members(user_id);

-- Enable RLS
ALTER TABLE public.school_members ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies first for a clean slate
DO $$
DECLARE
  policy_name text;
BEGIN
  FOR policy_name IN 
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'school_members' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.school_members', policy_name);
  END LOOP;
END
$$;

-- Create or replace helper functions
CREATE OR REPLACE FUNCTION public.is_school_admin(school_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.school_members
    WHERE user_id = auth.uid()
    AND school_id = $1
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.school_has_members(school_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.school_members 
    WHERE school_id = $1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create policies with unique names
CREATE POLICY "sm_view_own_20250411"
ON public.school_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "sm_create_first_admin_20250411"
ON public.school_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- For new schools without members
  NOT public.school_has_members(school_id)
);

CREATE POLICY "sm_admin_add_members_20250411"
ON public.school_members
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_school_admin(school_id)
);

CREATE POLICY "sm_admin_view_members_20250411"
ON public.school_members
FOR SELECT
TO authenticated
USING (public.is_school_admin(school_id));

CREATE POLICY "sm_admin_update_members_20250411"
ON public.school_members
FOR UPDATE
TO authenticated
USING (public.is_school_admin(school_id));

CREATE POLICY "sm_admin_delete_members_20250411"
ON public.school_members
FOR DELETE
TO authenticated
USING (public.is_school_admin(school_id));