/*
  # Fix set_super_admin function and add user status check
  
  1. Changes
    - Drop existing set_super_admin function with specific parameter types
    - Create a new version with a different name to avoid conflicts
    - Add function to check if a specific user is a super admin
  
  2. Security
    - Maintain same security model with SECURITY DEFINER
    - Fix the admin_id issue in the audit log
*/

-- Drop the existing function with explicit parameter types
DROP FUNCTION IF EXISTS public.set_super_admin(text, boolean);

-- Create a new version with a different name to avoid conflicts
CREATE OR REPLACE FUNCTION public.make_super_admin(user_email text, is_admin boolean DEFAULT true)
RETURNS void AS $$
DECLARE
  target_user_id UUID;
  current_user_id UUID;
BEGIN
  -- Get current user ID if available
  current_user_id := auth.uid();
  
  -- Find the user by email
  SELECT id 
  INTO target_user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Update super admin status
  UPDATE auth.users
  SET is_super_admin = is_admin
  WHERE id = target_user_id;
  
  -- Log this action without using auth.uid()
  -- Use the current_user_id if available, otherwise use target_user_id
  INSERT INTO super_admin_actions (
    admin_id, 
    action_type, 
    affected_user_id,
    details
  ) VALUES (
    COALESCE(current_user_id, target_user_id), -- Use target_user_id as fallback
    CASE WHEN is_admin THEN 'grant_super_admin' ELSE 'revoke_super_admin' END,
    target_user_id,
    jsonb_build_object('email', user_email)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION make_super_admin IS 
'Sets a user as a super administrator.
Usage (from SQL editor):
  SELECT make_super_admin(''user@example.com'', true);
  
To remove super admin status:
  SELECT make_super_admin(''user@example.com'', false);';

-- Create a function to check if a specific user is a super admin
CREATE OR REPLACE FUNCTION public.check_user_super_admin(user_email text)
RETURNS boolean AS $$
DECLARE
  is_admin boolean;
BEGIN
  SELECT is_super_admin INTO is_admin
  FROM auth.users
  WHERE email = user_email;
  
  RETURN COALESCE(is_admin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_user_super_admin IS
'Checks if a user with the given email is a super admin.
Usage (from SQL editor):
  SELECT check_user_super_admin(''user@example.com'');
Returns true if the user is a super admin, false otherwise.';