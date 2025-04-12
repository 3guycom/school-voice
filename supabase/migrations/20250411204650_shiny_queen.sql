/*
  # Fix functions to use auth.users instead of users table
  
  1. Changes
    - Update functions to reference auth.users instead of users table
    - Fix schema references in function definitions
    - Add proper search_path settings
    
  2. Security
    - Maintain same security model
    - Use proper schema references
*/

-- Drop existing policies to rebuild them
DROP POLICY IF EXISTS "Super admins can manage all school members" ON school_members;
DROP POLICY IF EXISTS "Super admins can view all school members" ON school_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON school_members;

-- Create stored procedures for safe data access
CREATE OR REPLACE FUNCTION get_school_members(p_school_id UUID)
RETURNS TABLE (
  id UUID,
  school_id UUID,
  user_id UUID,
  role TEXT,
  user_email TEXT,
  user_full_name TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sm.id,
    sm.school_id,
    sm.user_id,
    sm.role,
    u.email,
    u.raw_user_meta_data->>'full_name' as user_full_name,
    sm.created_at,
    sm.updated_at
  FROM school_members sm
  JOIN auth.users u ON u.id = sm.user_id
  WHERE sm.school_id = p_school_id
  AND (
    -- User is a member of the school
    EXISTS (
      SELECT 1 FROM school_members 
      WHERE school_id = p_school_id 
      AND user_id = auth.uid()
    )
    -- Or user is a super admin
    OR EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND (raw_app_meta_data->>'is_super_admin')::boolean = true
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_tone_profiles(p_school_id UUID)
RETURNS TABLE (
  id UUID,
  school_id UUID,
  name TEXT,
  dimensions JSONB,
  created_by UUID,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tp.id,
    tp.school_id,
    tp.name,
    tp.dimensions,
    tp.created_by,
    tp.is_active,
    tp.created_at,
    tp.updated_at
  FROM tone_profiles tp
  WHERE tp.school_id = p_school_id
  AND (
    -- User is a member of the school
    EXISTS (
      SELECT 1 FROM school_members 
      WHERE school_id = p_school_id 
      AND user_id = auth.uid()
    )
    -- Or user is a super admin
    OR EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND (raw_app_meta_data->>'is_super_admin')::boolean = true
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_school_invitations(p_school_id UUID)
RETURNS TABLE (
  id UUID,
  school_id UUID,
  email TEXT,
  token TEXT,
  role TEXT,
  created_by UUID,
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.school_id,
    i.email,
    i.token,
    i.role,
    i.created_by,
    i.expires_at,
    i.accepted_at,
    i.created_at
  FROM invitations i
  WHERE i.school_id = p_school_id
  AND (
    -- User is an admin of the school
    EXISTS (
      SELECT 1 FROM school_members 
      WHERE school_id = p_school_id 
      AND user_id = auth.uid()
      AND role = 'admin'
    )
    -- Or user is a super admin
    OR EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND (raw_app_meta_data->>'is_super_admin')::boolean = true
    )
  );
END;
$$;

-- Add new non-recursive policies
CREATE POLICY "Super admins can manage all school members"
ON school_members
TO authenticated
USING (EXISTS (
  SELECT 1 FROM auth.users
  WHERE id = auth.uid()
  AND (raw_app_meta_data->>'is_super_admin')::boolean = true
))
WITH CHECK (EXISTS (
  SELECT 1 FROM auth.users
  WHERE id = auth.uid()
  AND (raw_app_meta_data->>'is_super_admin')::boolean = true
));

CREATE POLICY "Users can view own memberships"
ON school_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_school_members TO authenticated;
GRANT EXECUTE ON FUNCTION get_tone_profiles TO authenticated;
GRANT EXECUTE ON FUNCTION get_school_invitations TO authenticated;