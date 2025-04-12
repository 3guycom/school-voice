/*
  # Add functions for Super Admin to create users and schools

  1. New Features
    - Function to create a user with optional super admin status
    - Function to create a school and assign an admin
    - Functions to simplify user membership management

  2. Security
    - Functions use SECURITY DEFINER to operate with elevated privileges
    - Role-based validation ensures only super admins can use these functions
    - Proper error handling and validation
*/

-- Create function for super admins to create users
CREATE OR REPLACE FUNCTION create_user_as_admin(
  email TEXT, 
  password TEXT, 
  full_name TEXT DEFAULT NULL, 
  is_super_admin BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Verify the calling user is a super admin
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Permission denied: Only super admins can create users';
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
    auth.uid(),
    'create_user',
    new_user_id,
    jsonb_build_object(
      'email', email,
      'is_super_admin', is_super_admin
    )
  );
  
  RETURN new_user_id;
END;
$$;

COMMENT ON FUNCTION create_user_as_admin IS 
'Creates a new user with optional super admin privileges. Only callable by super admins.';

-- Create function for super admins to create schools
CREATE OR REPLACE FUNCTION create_school_as_admin(
  school_name TEXT,
  website TEXT DEFAULT NULL,
  admin_email TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_school_id UUID;
  admin_user_id UUID;
BEGIN
  -- Verify the calling user is a super admin
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Permission denied: Only super admins can create schools directly';
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
  
  -- Log the action
  INSERT INTO super_admin_actions (
    admin_id,
    action_type,
    affected_school_id,
    details
  ) VALUES (
    auth.uid(),
    'create_school',
    new_school_id,
    jsonb_build_object(
      'name', school_name,
      'website', website,
      'admin_email', admin_email
    )
  );
  
  RETURN new_school_id;
END;
$$;

COMMENT ON FUNCTION create_school_as_admin IS 
'Creates a new school with an optional admin user. Only callable by super admins.';

-- Create function to add a user to a school
CREATE OR REPLACE FUNCTION add_user_to_school(
  user_email TEXT,
  school_id UUID,
  role TEXT DEFAULT 'member'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
  membership_id UUID;
BEGIN
  -- Verify the calling user is a super admin or school admin
  IF NOT (
    public.is_super_admin() OR 
    (auth.uid() IS NOT NULL AND public.is_school_admin(school_id))
  ) THEN
    RAISE EXCEPTION 'Permission denied: Only super admins or school admins can add users';
  END IF;
  
  -- Check if the role is valid
  IF role NOT IN ('admin', 'member') THEN
    RAISE EXCEPTION 'Invalid role: must be admin or member';
  END IF;

  -- Find the user by email
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Check if the user is already a member of the school
  IF EXISTS (
    SELECT 1 
    FROM public.school_members 
    WHERE school_id = add_user_to_school.school_id AND user_id = add_user_to_school.user_id
  ) THEN
    RAISE EXCEPTION 'User is already a member of this school';
  END IF;
  
  -- Add the user to the school
  INSERT INTO public.school_members (
    school_id,
    user_id,
    role
  ) VALUES (
    school_id,
    user_id,
    role
  )
  RETURNING id INTO membership_id;
  
  -- Log the action
  INSERT INTO super_admin_actions (
    admin_id,
    action_type,
    affected_user_id,
    affected_school_id,
    details
  ) VALUES (
    auth.uid(),
    'add_user_to_school',
    user_id,
    school_id,
    jsonb_build_object(
      'email', user_email,
      'role', role
    )
  );
  
  RETURN membership_id;
END;
$$;

COMMENT ON FUNCTION add_user_to_school IS 
'Adds a user to a school with specified role. Callable by super admins or school admins.';