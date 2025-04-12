/*
  # Fix Super Admin Policy Creation
  
  1. Changes
    - Drop existing super admin policies before creating new ones
    - Use DROP POLICY IF EXISTS to safely handle existing policies
    - Maintain same policy names but avoid conflicts
  
  2. Security
    - Ensure super admins maintain same level of access
    - Fix permission errors when deploying migrations
*/

-- Drop existing policies first for super_admin_actions table
DROP POLICY IF EXISTS "Super admins can view audit logs" ON super_admin_actions;
DROP POLICY IF EXISTS "Super admins can insert audit logs" ON super_admin_actions;

-- Recreate RLS policies for super_admin_actions
CREATE POLICY "Super admins can view audit logs"
ON super_admin_actions
FOR SELECT
TO authenticated
USING (public.is_super_admin());

CREATE POLICY "Super admins can insert audit logs"
ON super_admin_actions
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  AND admin_id = auth.uid()
);

-- Fix other super admin policies by first dropping them

-- Drop and recreate schools table super admin policies
DROP POLICY IF EXISTS "Super admins can view all schools" ON schools;
DROP POLICY IF EXISTS "Super admins can manage all schools" ON schools;

CREATE POLICY "Super admins can view all schools"
ON schools
FOR SELECT
TO authenticated
USING (public.is_super_admin());

CREATE POLICY "Super admins can manage all schools"
ON schools
FOR ALL
TO authenticated
USING (public.is_super_admin());

-- Drop and recreate school_members table super admin policies
DROP POLICY IF EXISTS "Super admins can view all school members" ON school_members;
DROP POLICY IF EXISTS "Super admins can manage all school members" ON school_members;

CREATE POLICY "Super admins can view all school members"
ON school_members
FOR SELECT
TO authenticated
USING (public.is_super_admin());

CREATE POLICY "Super admins can manage all school members"
ON school_members
FOR ALL
TO authenticated
USING (public.is_super_admin());

-- Drop and recreate tone_profiles table super admin policies
DROP POLICY IF EXISTS "Super admins can view all tone profiles" ON tone_profiles;
DROP POLICY IF EXISTS "Super admins can manage all tone profiles" ON tone_profiles;

CREATE POLICY "Super admins can view all tone profiles"
ON tone_profiles
FOR SELECT
TO authenticated
USING (public.is_super_admin());

CREATE POLICY "Super admins can manage all tone profiles"
ON tone_profiles
FOR ALL
TO authenticated
USING (public.is_super_admin());

-- Drop and recreate content_drafts table super admin policies
DROP POLICY IF EXISTS "Super admins can view all content drafts" ON content_drafts;
DROP POLICY IF EXISTS "Super admins can manage all content drafts" ON content_drafts;

CREATE POLICY "Super admins can view all content drafts"
ON content_drafts
FOR SELECT
TO authenticated
USING (public.is_super_admin());

CREATE POLICY "Super admins can manage all content drafts"
ON content_drafts
FOR ALL
TO authenticated
USING (public.is_super_admin());

-- Drop and recreate invitations table super admin policies
DROP POLICY IF EXISTS "Super admins can view all invitations" ON invitations;
DROP POLICY IF EXISTS "Super admins can manage all invitations" ON invitations;

CREATE POLICY "Super admins can view all invitations"
ON invitations
FOR SELECT
TO authenticated
USING (public.is_super_admin());

CREATE POLICY "Super admins can manage all invitations"
ON invitations
FOR ALL
TO authenticated
USING (public.is_super_admin());