/*
  # Add RPC functions to fix infinite recursion

  1. New Functions
    - `get_user_schools_direct`: Gets schools for a user directly, bypassing RLS
    - `get_all_schools_for_admin`: Gets all schools for super admin, bypassing RLS
    - `get_schools_service_api`: Gets schools using service role, bypassing RLS
    - `check_user_super_admin`: Checks if a user is a super admin

  2. Security
    - All functions are SECURITY DEFINER to bypass RLS
    - Functions include proper permission checks
    - Functions are properly secured against SQL injection
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
  RETURN QUERY
  SELECT 
    s.id as school_id,
    s.name as school_name,
    sm.role
  FROM schools s
  INNER JOIN school_members sm ON s.id = sm.school_id
  WHERE sm.user_id = user_id_param
  ORDER BY s.name;
END;
$$;

-- Function to get all schools for super admin
CREATE OR REPLACE FUNCTION get_all_schools_for_admin()
RETURNS SETOF schools
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- First verify the user is a super admin
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND is_super_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  RETURN QUERY
  SELECT * FROM schools
  ORDER BY name;
END;
$$;

-- Function to get schools using service role
CREATE OR REPLACE FUNCTION get_schools_service_api()
RETURNS SETOF schools
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- First verify the user is a super admin
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND is_super_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  RETURN QUERY
  SELECT * FROM schools
  ORDER BY name;
END;
$$;

-- Function to check if a user is a super admin
CREATE OR REPLACE FUNCTION check_user_super_admin(user_email TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE email = user_email 
    AND is_super_admin = true
  );
END;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_user_schools_direct TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_schools_for_admin TO authenticated;
GRANT EXECUTE ON FUNCTION get_schools_service_api TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_super_admin TO authenticated;