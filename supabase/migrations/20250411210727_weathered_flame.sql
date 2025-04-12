/*
  # Fix RPC functions for Super Admin dashboard

  1. Changes
    - Fixed get_all_schools_for_admin function to avoid policy recursion
    - Fixed get_all_school_members_for_admin function to match return types
    - Added proper type definitions for function returns
    - Removed ambiguous id references

  2. Security
    - Functions are restricted to super_admin users only
    - Uses security definer to bypass RLS
*/

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_all_schools_for_admin();
DROP FUNCTION IF EXISTS get_all_school_members_for_admin();
DROP FUNCTION IF EXISTS get_schools_service_api();

-- Create type for school member results
DROP TYPE IF EXISTS school_member_result;
CREATE TYPE school_member_result AS (
  user_id uuid,
  email text,
  display_name text,
  is_super_admin boolean,
  school_id uuid,
  school_name text,
  role text
);

-- Function to get all schools for super admin
CREATE OR REPLACE FUNCTION get_all_schools_for_admin()
RETURNS TABLE (
  id uuid,
  name text,
  website text,
  created_at timestamptz,
  updated_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user is super admin
  IF NOT (SELECT is_super_admin()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    schools.id,
    schools.name,
    schools.website,
    schools.created_at,
    schools.updated_at
  FROM schools
  ORDER BY schools.name;
END;
$$;

-- Function to get all school members for super admin
CREATE OR REPLACE FUNCTION get_all_school_members_for_admin()
RETURNS SETOF school_member_result
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user is super admin
  IF NOT (SELECT is_super_admin()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    users.id as user_id,
    users.email::text,
    users.raw_user_meta_data->>'full_name' as display_name,
    ((users.raw_app_meta_data->>'is_super_admin')::boolean) as is_super_admin,
    schools.id as school_id,
    schools.name as school_name,
    school_members.role
  FROM users
  LEFT JOIN school_members ON users.id = school_members.user_id
  LEFT JOIN schools ON school_members.school_id = schools.id
  ORDER BY users.email;
END;
$$;