/*
  # Add school member creation to user creation function
  
  1. Changes
    - Update create_user_for_edge_function to handle school assignment
    - Add school member creation after user creation
    - Add validation for school role
    
  2. Security
    - Maintain existing security checks
    - Add validation for school assignment
*/

-- Update the function to handle school assignment
CREATE OR REPLACE FUNCTION create_user_for_edge_function(
  email text,
  password text,
  full_name text DEFAULT NULL,
  is_super_admin boolean DEFAULT false,
  school_id uuid DEFAULT NULL,
  school_role text DEFAULT 'member',
  service_role_key text DEFAULT NULL
)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  new_user_id uuid;
  response jsonb;
BEGIN
  -- Validate school role if school_id is provided
  IF school_id IS NOT NULL AND school_role NOT IN ('admin', 'member') THEN
    RAISE EXCEPTION 'Invalid school role. Must be either admin or member';
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
    jsonb_build_object(
      'provider', 'email',
      'providers', ARRAY['email']::text[],
      'is_super_admin', is_super_admin
    ),
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

  -- If school_id is provided, create school membership
  IF school_id IS NOT NULL THEN
    INSERT INTO school_members (
      school_id,
      user_id,
      role
    ) VALUES (
      school_id,
      new_user_id,
      school_role
    );
  END IF;

  -- Build response
  response := jsonb_build_object(
    'id', new_user_id,
    'email', email,
    'is_super_admin', is_super_admin
  );

  IF school_id IS NOT NULL THEN
    response := response || jsonb_build_object(
      'school_id', school_id,
      'school_role', school_role
    );
  END IF;

  RETURN response;
END;
$$;