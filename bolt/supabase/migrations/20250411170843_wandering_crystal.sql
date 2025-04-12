/*
  # Fix set_super_admin function to handle SQL editor usage
  
  1. Changes
    - Specify exact function signature when dropping
    - Create a new function with unique parameter list
    - Add admin_id parameter to support SQL editor usage
    
  2. Security
    - Maintain SECURITY DEFINER attribute
    - Same permissions and access control
    - Better audit logging
*/

-- Drop all existing versions of the function with specific signatures
DROP FUNCTION IF EXISTS public.set_super_admin(text, boolean);
DROP FUNCTION IF EXISTS public.set_super_admin(text);
DROP FUNCTION IF EXISTS public.set_super_admin(text, boolean, uuid);

-- Create a new version with a clear parameter list
CREATE OR REPLACE FUNCTION public.set_super_admin(
  user_email text, 
  is_admin boolean DEFAULT TRUE,
  admin_user_id uuid DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  target_user_id UUID;
  acting_admin_id UUID;
BEGIN
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
  
  -- Determine acting admin ID - use parameter if provided, otherwise try auth.uid()
  acting_admin_id := COALESCE(admin_user_id, auth.uid(), target_user_id);
  
  -- Log this action
  INSERT INTO super_admin_actions (
    admin_id, 
    action_type, 
    affected_user_id,
    details
  ) VALUES (
    acting_admin_id,
    CASE WHEN is_admin THEN 'grant_super_admin' ELSE 'revoke_super_admin' END,
    target_user_id,
    jsonb_build_object(
      'email', user_email,
      'source', CASE 
                 WHEN admin_user_id IS NOT NULL THEN 'manual_override' 
                 WHEN auth.uid() IS NULL THEN 'sql_editor'
                 ELSE 'application' 
               END
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION set_super_admin IS 
'Sets a user as a super administrator.
Usage (from SQL editor):
  SELECT set_super_admin(''user@example.com'', true);
  
To remove super admin status:
  SELECT set_super_admin(''user@example.com'', false);

To set a super admin while specifying who is performing the action:
  SELECT set_super_admin(''user@example.com'', true, ''00000000-0000-0000-0000-000000000000''::uuid);';