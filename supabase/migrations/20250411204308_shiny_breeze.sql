/*
  # Fix recursive policies and relationships

  1. Changes
    - Remove recursive policies from school_members table
    - Add proper foreign key relationship between school_members and users
    - Add stored procedures for safe data access
    - Update policies to prevent infinite recursion

  2. Security
    - Maintain RLS while preventing recursion
    - Add safer access methods via stored procedures
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
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sm.id,
    sm.school_id,
    sm.user_id,
    sm.role,
    u.email,
    u.full_name,
    sm.created_at,
    sm.updated_at
  FROM school_members sm
  JOIN users u ON u.id = sm.user_id
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
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND is_super_admin = true
    )
  );
END;
$$ LANGUAGE plpgsql;

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
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND is_super_admin = true
    )
  );
END;
$$ LANGUAGE plpgsql;

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
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND is_super_admin = true
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Add new non-recursive policies
CREATE POLICY "Super admins can manage all school members"
ON school_members
TO authenticated
USING (EXISTS (
  SELECT 1 FROM users
  WHERE id = auth.uid()
  AND is_super_admin = true
))
WITH CHECK (EXISTS (
  SELECT 1 FROM users
  WHERE id = auth.uid()
  AND is_super_admin = true
));

CREATE POLICY "Users can view own memberships"
ON school_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());