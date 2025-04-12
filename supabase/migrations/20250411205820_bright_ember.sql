/*
  # Add RPC functions for school member queries

  1. New Functions
    - `get_user_schools_direct`: Retrieves schools for a specific user
    - `get_all_schools_for_admin`: Retrieves all schools for super admin
    - `get_schools_service_api`: Service role backup for school fetching
    - `get_all_school_members_for_admin`: Retrieves all school members for super admin

  2. Security
    - All functions are secured with proper permission checks
    - Super admin verification is performed within each function
    - Row level security is bypassed safely using SECURITY DEFINER
*/

-- Function to get user's schools directly
CREATE OR REPLACE FUNCTION get_user_schools_direct(user_id_param UUID)
RETURNS TABLE (
  school_id UUID,
  school_name TEXT,
  role TEXT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if the requesting user is either a super admin or the user themselves
  IF (
    NOT EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND (
        -- Either the user is requesting their own data
        id = user_id_param
        OR
        -- Or they are a super admin
        (raw_app_meta_data->>'is_super_admin')::boolean = true
      )
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT 
    sm.school_id,
    s.name as school_name,
    sm.role
  FROM school_members sm
  JOIN schools s ON s.id = sm.school_id
  WHERE sm.user_id = user_id_param
  ORDER BY s.name;
END;
$$;

-- Function to get all schools for super admin
CREATE OR REPLACE FUNCTION get_all_schools_for_admin()
RETURNS TABLE (
  id UUID,
  name TEXT,
  website TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verify super admin status
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND (raw_app_meta_data->>'is_super_admin')::boolean = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Super admin privileges required';
  END IF;

  RETURN QUERY
  SELECT s.id, s.name, s.website, s.created_at, s.updated_at
  FROM schools s
  ORDER BY s.name;
END;
$$;

-- Function to get schools using service role (backup method)
CREATE OR REPLACE FUNCTION get_schools_service_api()
RETURNS TABLE (
  id UUID,
  name TEXT,
  website TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verify super admin status
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND (raw_app_meta_data->>'is_super_admin')::boolean = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Super admin privileges required';
  END IF;

  RETURN QUERY
  SELECT s.id, s.name, s.website, s.created_at, s.updated_at
  FROM schools s
  ORDER BY s.name;
END;
$$;

-- Function to get all school members for super admin
CREATE OR REPLACE FUNCTION get_all_school_members_for_admin()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  display_name TEXT,
  is_super_admin BOOLEAN,
  school_id UUID,
  school_name TEXT,
  role TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verify super admin status
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND (raw_app_meta_data->>'is_super_admin')::boolean = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Super admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email,
    u.raw_user_meta_data->>'full_name' as display_name,
    (u.raw_app_meta_data->>'is_super_admin')::boolean as is_super_admin,
    sm.school_id,
    s.name as school_name,
    sm.role
  FROM auth.users u
  LEFT JOIN school_members sm ON sm.user_id = u.id
  LEFT JOIN schools s ON s.id = sm.school_id
  ORDER BY u.email, s.name;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_schools_direct TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_schools_for_admin TO authenticated;
GRANT EXECUTE ON FUNCTION get_schools_service_api TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_school_members_for_admin TO authenticated;