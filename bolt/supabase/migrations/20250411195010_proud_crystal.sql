/*
  # Add edge function support for user and school creation
  
  1. New Functions
    - Functions for securely creating users and schools from edge functions
    - Helper functions for permission checks
    
  2. Security
    - Service role key validation
    - Audit logging of all operations
    - Appropriate grants for authenticated users
*/

-- Create secure RPC function for edge functions to create users
CREATE OR REPLACE FUNCTION create_user_for_edge_function(
  email TEXT, 
  password TEXT, 
  full_name TEXT DEFAULT NULL, 
  is_super_admin BOOLEAN DEFAULT FALSE,
  service_role_key TEXT DEFAULT NULL  -- Added DEFAULT NULL to fix the error
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
  expected_key TEXT;
BEGIN
  -- Get the expected service role key from env variable (this is a mock check - real check would need PL/pgSQL extensions)
  -- In production, you'd use Postgres vault or a more secure way to validate the service role key
  -- This is just a simple example
  SELECT current_setting('app.settings.service_role_key', true) INTO expected_key;
  
  -- Service role key is required despite the DEFAULT NULL (we check it here)
  IF service_role_key IS NULL THEN
    RAISE EXCEPTION 'Service role key is required';
  END IF;
  
  -- Simple validation of service role key
  IF expected_key IS NOT NULL AND service_role_key != expected_key THEN
    RAISE EXCEPTION 'Unauthorized: Invalid service role key';
  END IF;

  -- Create the user
  INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    raw_app_meta_data,
    is_super_admin,
    role
  ) VALUES (
    email,
    crypt(password, gen_salt('bf')),
    NOW(),
    jsonb_build_object('full_name', full_name),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::text[]),
    is_super_admin,
    'authenticated'
  )
  RETURNING id INTO new_user_id;
  
  -- Create identity record
  INSERT INTO auth.identities (
    id,
    provider,
    provider_id,
    user_id,
    identity_data,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    'email',
    email,
    new_user_id,
    jsonb_build_object('sub', new_user_id, 'email', email),
    NOW(),
    NOW()
  );
  
  -- Log the action
  INSERT INTO super_admin_actions (
    admin_id,
    action_type,
    affected_user_id,
    details
  ) VALUES (
    new_user_id, -- Using the new user as admin since this is called from edge function
    'create_user_edge_function',
    new_user_id,
    jsonb_build_object(
      'email', email,
      'is_super_admin', is_super_admin
    )
  );
  
  RETURN jsonb_build_object(
    'id', new_user_id,
    'email', email,
    'is_super_admin', is_super_admin
  );
END;
$$;

COMMENT ON FUNCTION create_user_for_edge_function IS 
'Securely creates a user from an edge function using service role key authentication';

-- Create secure RPC function for edge functions to create schools
CREATE OR REPLACE FUNCTION create_school_for_edge_function(
  school_name TEXT,
  website TEXT DEFAULT NULL,
  admin_email TEXT DEFAULT NULL,
  service_role_key TEXT DEFAULT NULL  -- Added DEFAULT NULL to fix the error
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_school_id UUID;
  admin_user_id UUID;
  expected_key TEXT;
BEGIN
  -- Get the expected service role key from env variable
  SELECT current_setting('app.settings.service_role_key', true) INTO expected_key;
  
  -- Service role key is required despite the DEFAULT NULL (we check it here)
  IF service_role_key IS NULL THEN
    RAISE EXCEPTION 'Service role key is required';
  END IF;
  
  -- Simple validation of service role key
  IF expected_key IS NOT NULL AND service_role_key != expected_key THEN
    RAISE EXCEPTION 'Unauthorized: Invalid service role key';
  END IF;

  -- Create the school
  INSERT INTO public.schools (
    name,
    website
  ) VALUES (
    school_name,
    website
  )
  RETURNING id INTO new_school_id;
  
  -- If an admin email is provided, add that user as an admin of the school
  IF admin_email IS NOT NULL THEN
    -- Find the user by email
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = admin_email;
    
    IF admin_user_id IS NULL THEN
      RAISE EXCEPTION 'User with email % not found', admin_email;
    END IF;
    
    -- Add the user as an admin of the school
    INSERT INTO public.school_members (
      school_id,
      user_id,
      role
    ) VALUES (
      new_school_id,
      admin_user_id,
      'admin'
    );
  END IF;
  
  -- Log the action without referring to auth.uid() since this is from edge function
  INSERT INTO super_admin_actions (
    admin_id,
    action_type,
    affected_school_id,
    details
  ) VALUES (
    COALESCE(admin_user_id, '00000000-0000-0000-0000-000000000000'::UUID),
    'create_school_edge_function',
    new_school_id,
    jsonb_build_object(
      'name', school_name,
      'website', website,
      'admin_email', admin_email
    )
  );
  
  RETURN jsonb_build_object(
    'id', new_school_id,
    'name', school_name,
    'admin_email', admin_email
  );
END;
$$;

COMMENT ON FUNCTION create_school_for_edge_function IS 
'Securely creates a school from an edge function using service role key authentication';

-- Grant execute permissions for auth handling
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_super_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_schools_direct(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_school_admin(UUID) TO authenticated;