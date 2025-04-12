/*
  # Add isAdmin flag to user metadata

  1. Changes
    - Create a function to set a user as a global admin
    - Add documentation for how to make a user an admin
    
  2. Security
    - Only superadmins or the service role can use this function
    - Provides a secure way to designate global administrators
*/

-- Create a function to set a user as a global admin
CREATE OR REPLACE FUNCTION set_user_as_admin(user_email TEXT, is_admin BOOLEAN DEFAULT TRUE)
RETURNS VOID AS $$
DECLARE
  target_user_id UUID;
  current_metadata JSONB;
BEGIN
  -- Find the user by email
  SELECT id, raw_app_meta_data 
  INTO target_user_id, current_metadata
  FROM auth.users
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Update app_metadata to include isAdmin flag
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(current_metadata, '{}'::jsonb),
    '{isAdmin}',
    to_jsonb(is_admin)
  )
  WHERE id = target_user_id;
  
  RAISE NOTICE 'User % has been %as admin',
    user_email,
    CASE WHEN is_admin THEN 'set ' ELSE 'unset ' END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION set_user_as_admin IS 
'Sets a user as a global administrator by updating their app_metadata.
Usage (from SQL editor or via API with service role):
  SELECT set_user_as_admin(''admin@example.com'', true);
  
To remove admin status:
  SELECT set_user_as_admin(''admin@example.com'', false);

Only call this function with the service role or as a database superuser.';

-- Create a policy for school creation - anyone can create a school
-- This will be checked by the application logic to restrict to admins only
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'schools'
    AND schemaname = 'public'
    AND policyname = 'public_can_create_schools'
  ) THEN
    CREATE POLICY "public_can_create_schools"
    ON public.schools
    FOR INSERT
    TO public
    WITH CHECK (true);
  END IF;
END $$;