/*
  # Fix helper functions and policies
  
  1. Changes
    - Create helper functions for admin and member checks
    - Create policies for school_members table
    - Add invitations table
    
  2. Security
    - Maintain same security model for tables
    - Use helper functions for policy checks
*/

-- Create helper functions
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

-- Create invitations table if it doesn't exist
CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('admin', 'member')),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(school_id, email)
);

-- Enable RLS on invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (one by one to avoid errors)
DROP POLICY IF EXISTS "sm_view_own_20250411_2" ON public.school_members;
DROP POLICY IF EXISTS "sm_create_first_admin_20250411_2" ON public.school_members;
DROP POLICY IF EXISTS "sm_admin_add_members_20250411_2" ON public.school_members;
DROP POLICY IF EXISTS "sm_admin_view_members_20250411_2" ON public.school_members;
DROP POLICY IF EXISTS "sm_admin_update_members_20250411_2" ON public.school_members;
DROP POLICY IF EXISTS "sm_admin_delete_members_20250411_2" ON public.school_members;

-- Create policies with unique names
CREATE POLICY "sm_view_own_20250411_2"
ON public.school_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "sm_create_first_admin_20250411_2"
ON public.school_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- For new schools without members
  NOT public.school_has_members(school_id)
);

CREATE POLICY "sm_admin_add_members_20250411_2"
ON public.school_members
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_school_admin(school_id)
);

CREATE POLICY "sm_admin_view_members_20250411_2"
ON public.school_members
FOR SELECT
TO authenticated
USING (public.is_school_admin(school_id));

CREATE POLICY "sm_admin_update_members_20250411_2"
ON public.school_members
FOR UPDATE
TO authenticated
USING (public.is_school_admin(school_id));

CREATE POLICY "sm_admin_delete_members_20250411_2"
ON public.school_members
FOR DELETE
TO authenticated
USING (public.is_school_admin(school_id));