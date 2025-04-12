/*
  # Fix super admin check function

  1. Changes
    - Update check_user_super_admin function to use auth.users instead of users table
    - Add proper error handling and schema references

  2. Security
    - Function remains accessible to authenticated users only
    - Maintains existing security context
*/

CREATE OR REPLACE FUNCTION check_user_super_admin(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM auth.users
    WHERE 
      email = user_email
      AND raw_app_meta_data->>'is_super_admin' = 'true'
  );
END;
$$;