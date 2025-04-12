/*
  # Fix check_user_super_admin function

  1. Changes
    - Fix the RPC function to correctly check for super admin status
    - Remove reference to non-existent app_metadata column
    - Use the correct raw_user_meta_data column to access user metadata
  
  2. Issues Fixed
    - 400 error when calling check_user_super_admin function
    - Incorrect column reference causing SQL errors
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.check_user_super_admin(user_email text);

-- Recreate the function with the correct implementation
CREATE OR REPLACE FUNCTION public.check_user_super_admin(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Check if the user exists and is a super admin
  SELECT (raw_user_meta_data->>'is_super_admin')::boolean INTO is_admin
  FROM auth.users
  WHERE email = user_email;
  
  -- Return false if user not found or is_super_admin is not set
  RETURN COALESCE(is_admin, false);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_user_super_admin(text) TO authenticated;

-- For super_admin check in the JWT
CREATE OR REPLACE FUNCTION auth.user_has_super_admin_role()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = auth, public
AS $$
DECLARE
  super_admin_role BOOLEAN;
BEGIN
  SELECT (raw_user_meta_data->>'is_super_admin')::boolean INTO super_admin_role 
  FROM auth.users
  WHERE id = auth.uid();
  
  RETURN COALESCE(super_admin_role, false);
END;
$$;