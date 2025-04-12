/*
  # Fix school members policy recursion

  1. Changes
    - Add RPC function to safely get user schools without triggering policy recursion
    - Add RPC function to get user details by ID
    - Add RPC function to get all schools for admin
    - Add RPC function to check super admin status

  2. Security
    - Functions are restricted to authenticated users only
    - Super admin check is performed within functions where needed
*/

-- Function to get user schools directly without policy recursion
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
  FROM school_members sm
  JOIN schools s ON s.id = sm.school_id
  WHERE sm.user_id = user_id_param;
END;
$$;

-- Function to get user details by ID
CREATE OR REPLACE FUNCTION get_user_by_id(user_id UUID)
RETURNS TABLE (
  email TEXT,
  display_name TEXT,
  is_super_admin BOOLEAN
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.email,
    u.raw_user_meta_data->>'full_name' as display_name,
    (u.raw_app_meta_data->>'is_super_admin')::boolean as is_super_admin
  FROM auth.users u
  WHERE u.id = user_id;
END;
$$;

-- Function to get all schools for admin
CREATE OR REPLACE FUNCTION get_all_schools_for_admin()
RETURNS SETOF schools
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Check if the user is a super admin
  SELECT (raw_app_meta_data->>'is_super_admin')::boolean INTO is_admin
  FROM auth.users
  WHERE id = auth.uid();

  IF is_admin THEN
    RETURN QUERY SELECT * FROM schools ORDER BY name;
  ELSE
    RETURN QUERY SELECT * FROM schools WHERE FALSE;
  END IF;
END;
$$;

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION check_user_super_admin(user_email TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  SELECT (raw_app_meta_data->>'is_super_admin')::boolean INTO is_admin
  FROM auth.users
  WHERE email = user_email;
  
  RETURN COALESCE(is_admin, false);
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_schools_direct TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_by_id TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_schools_for_admin TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_super_admin TO authenticated;