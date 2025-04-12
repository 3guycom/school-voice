/*
  # Make lewis@3guy.com a super admin
  
  1. Changes
    - Set is_super_admin flag to true for lewis@3guy.com
    - Add audit log entry for the change
*/

-- First make sure the user exists and get their ID
DO $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Get the user's ID
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'lewis@3guy.com';
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User lewis@3guy.com not found';
  END IF;

  -- Update the user to be a super admin
  UPDATE auth.users
  SET is_super_admin = true
  WHERE id = target_user_id;

  -- Log this action in super_admin_actions
  INSERT INTO super_admin_actions (
    admin_id,
    action_type,
    affected_user_id,
    details
  ) VALUES (
    target_user_id, -- Using the user's own ID since this is a migration
    'grant_super_admin',
    target_user_id,
    jsonb_build_object(
      'email', 'lewis@3guy.com',
      'source', 'migration'
    )
  );
END $$;