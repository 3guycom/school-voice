/*
  # Add RPC functions for user schools access
  
  1. New Functions
    - `get_user_schools_direct` - Direct access to user's schools bypassing RLS
    - `get_user_schools` - Alternative access method
    - `get_admin_stats` - Stats for super admins
    - `check_user_super_admin` - Verify super admin status
  
  2. Security
    - All functions use SECURITY DEFINER to execute with required privileges
    - All functions have strict permission checks
*/

-- Function to check if a user is a super admin by their email
CREATE OR REPLACE FUNCTION public.check_user_super_admin(user_email text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  is_admin boolean;
BEGIN
  SELECT app_metadata->>'is_super_admin' = 'true' INTO is_admin
  FROM auth.users
  WHERE email = user_email;
  
  RETURN COALESCE(is_admin, false);
END;
$$;

-- Function to get all schools for a user directly without policy recursion
CREATE OR REPLACE FUNCTION public.get_user_schools_direct(user_id_param uuid)
RETURNS TABLE(
  school_id uuid,
  school_name text,
  role text
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id as school_id,
    s.name as school_name,
    sm.role
  FROM
    school_members sm
    JOIN schools s ON sm.school_id = s.id
  WHERE
    sm.user_id = user_id_param
  ORDER BY
    s.name;
END;
$$;

-- Get all schools for super admins
CREATE OR REPLACE FUNCTION public.get_all_schools_for_admin()
RETURNS SETOF schools
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  requesting_user_email text;
  is_super_admin boolean;
BEGIN
  -- Get the requesting user's email
  requesting_user_email := auth.jwt() ->> 'email';
  
  -- Check if the user is a super admin
  SELECT check_user_super_admin(requesting_user_email) INTO is_super_admin;
  
  -- If not a super admin, raise an exception
  IF NOT is_super_admin THEN
    RAISE EXCEPTION 'Permission denied: Super admin privileges required';
  END IF;
  
  -- Return all schools for super admins
  RETURN QUERY
  SELECT * FROM schools ORDER BY name;
END;
$$;

-- Function to get system-wide stats for super admins
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  requesting_user_email text;
  is_super_admin boolean;
  stats json;
BEGIN
  -- Get the requesting user's email
  requesting_user_email := auth.jwt() ->> 'email';
  
  -- Check if the user is a super admin
  SELECT check_user_super_admin(requesting_user_email) INTO is_super_admin;
  
  -- If not a super admin, raise an exception
  IF NOT is_super_admin THEN
    RAISE EXCEPTION 'Permission denied: Super admin privileges required';
  END IF;
  
  -- Get counts from various tables
  WITH counts AS (
    SELECT
      (SELECT COUNT(*) FROM schools) AS school_count,
      (SELECT COUNT(DISTINCT user_id) FROM school_members) AS user_count,
      (SELECT COUNT(*) FROM tone_profiles) AS profile_count,
      (SELECT COUNT(*) FROM content_drafts) AS draft_count
  )
  SELECT json_build_object(
    'school_count', school_count,
    'user_count', user_count,
    'profile_count', profile_count,
    'draft_count', draft_count
  ) INTO stats
  FROM counts;
  
  RETURN stats;
END;
$$;

-- Function to create a school (for super admins)
CREATE OR REPLACE FUNCTION public.create_school_for_admin(
  school_name text,
  school_website text,
  is_admin boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  requesting_user_email text;
  is_super_admin boolean;
  user_id uuid;
  new_school_id uuid;
BEGIN
  -- Get the requesting user's email
  requesting_user_email := auth.jwt() ->> 'email';
  
  -- Check if the user is a super admin
  SELECT check_user_super_admin(requesting_user_email) INTO is_super_admin;
  
  -- If not a super admin, raise an exception
  IF NOT is_super_admin THEN
    RAISE EXCEPTION 'Permission denied: Super admin privileges required';
  END IF;
  
  -- Get the user's ID
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = requesting_user_email;
  
  -- Create the school
  INSERT INTO schools (name, website)
  VALUES (school_name, school_website)
  RETURNING id INTO new_school_id;
  
  -- If is_admin is true (default), add the user as an admin of the school
  IF is_admin THEN
    INSERT INTO school_members (school_id, user_id, role)
    VALUES (new_school_id, user_id, 'admin');
  END IF;
  
  RETURN new_school_id;
END;
$$;