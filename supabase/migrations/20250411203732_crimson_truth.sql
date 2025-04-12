/*
  # Fix super admin setup for lewis@3guy.com
  
  1. Changes
    - Create user if not exists
    - Set is_super_admin flag in both user record and metadata
    - Ensure proper identity record exists
    - Add audit log entry
*/

DO $$
DECLARE
  target_user_id UUID := 'c8dd144b-1731-4574-bf5e-67b2bd6d874b';  -- Specific UUID for lewis@3guy.com
  user_exists BOOLEAN;
BEGIN
  -- Check if user exists
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = target_user_id
  ) INTO user_exists;

  -- Create user if doesn't exist
  IF NOT user_exists THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      last_sign_in_at,
      confirmation_token,
      is_super_admin,
      role
    ) VALUES (
      target_user_id,
      '00000000-0000-0000-0000-000000000000',
      'lewis@3guy.com',
      crypt('test123!', gen_salt('bf')),
      now(),
      jsonb_build_object(
        'provider', 'email',
        'providers', ARRAY['email']::text[],
        'is_super_admin', true
      ),
      jsonb_build_object(
        'is_super_admin', true
      ),
      now(),
      now(),
      now(),
      '',
      true,
      'authenticated'
    );

    -- Create identity record
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      target_user_id,
      target_user_id,
      jsonb_build_object('sub', target_user_id, 'email', 'lewis@3guy.com'),
      'email',
      'lewis@3guy.com',
      now(),
      now(),
      now()
    );
  ELSE
    -- Update existing user
    UPDATE auth.users
    SET 
      is_super_admin = true,
      raw_app_meta_data = jsonb_set(
        COALESCE(raw_app_meta_data, '{}'::jsonb),
        '{is_super_admin}',
        'true'
      ),
      raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{is_super_admin}',
        'true'
      )
    WHERE id = target_user_id;
  END IF;

  -- Log the action
  INSERT INTO super_admin_actions (
    admin_id,
    action_type,
    affected_user_id,
    details
  ) VALUES (
    target_user_id,
    'grant_super_admin',
    target_user_id,
    jsonb_build_object(
      'email', 'lewis@3guy.com',
      'source', 'migration',
      'user_created', NOT user_exists
    )
  );
END $$;