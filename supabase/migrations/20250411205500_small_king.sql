/*
  # Fix school members recursion

  1. New Functions
    - `get_all_school_members_for_admin`: Returns all school members with their details
    - `get_user_schools_with_details`: Returns schools and roles for a specific user
    - `get_user_details`: Returns user details by ID
    
  2. Security
    - All functions use SECURITY DEFINER to bypass RLS
    - Functions check for super admin status before returning data
    - Input parameters are properly validated
    
  3. Changes
    - Added helper function to check super admin status
    - Added function to get all school members for super admins
    - Added function to get user schools with details
    - Added function to get user details by ID
*/

-- Helper function to check if a user is a super admin
CREATE OR REPLACE FUNCTION is_super_admin_check()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT ((raw_app_meta_data->>'is_super_admin')::boolean)
    FROM auth.users
    WHERE id = auth.uid()
  );
END;
$$;

-- Function to get all school members for super admin
CREATE OR REPLACE FUNCTION get_all_school_members_for_admin()
RETURNS TABLE (
  user_id uuid,
  email text,
  display_name text,
  school_id uuid,
  school_name text,
  role text,
  is_super_admin boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the user is a super admin
  IF NOT is_super_admin_check() THEN
    RAISE EXCEPTION 'Access denied. Super admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    sm.user_id,
    au.email,
    au.raw_user_meta_data->>'full_name' as display_name,
    s.id as school_id,
    s.name as school_name,
    sm.role,
    (au.raw_app_meta_data->>'is_super_admin')::boolean as is_super_admin
  FROM school_members sm
  JOIN schools s ON s.id = sm.school_id
  JOIN auth.users au ON au.id = sm.user_id
  ORDER BY au.email, s.name;
END;
$$;

-- Function to get schools and roles for a specific user
CREATE OR REPLACE FUNCTION get_user_schools_with_details(user_id_param uuid)
RETURNS TABLE (
  school_id uuid,
  school_name text,
  role text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the requesting user is either the target user or a super admin
  IF auth.uid() != user_id_param AND NOT is_super_admin_check() THEN
    RAISE EXCEPTION 'Access denied. You can only view your own schools or must be a super admin.';
  END IF;

  RETURN QUERY
  SELECT 
    s.id as school_id,
    s.name as school_name,
    sm.role
  FROM school_members sm
  JOIN schools s ON s.id = sm.school_id
  WHERE sm.user_id = user_id_param
  ORDER BY s.name;
END;
$$;

-- Function to get user details by ID
CREATE OR REPLACE FUNCTION get_user_details(user_id_param uuid)
RETURNS TABLE (
  user_id uuid,
  email text,
  display_name text,
  is_super_admin boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the requesting user is either the target user or a super admin
  IF auth.uid() != user_id_param AND NOT is_super_admin_check() THEN
    RAISE EXCEPTION 'Access denied. You can only view your own details or must be a super admin.';
  END IF;

  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email,
    au.raw_user_meta_data->>'full_name' as display_name,
    (au.raw_app_meta_data->>'is_super_admin')::boolean as is_super_admin
  FROM auth.users au
  WHERE au.id = user_id_param;
END;
$$;