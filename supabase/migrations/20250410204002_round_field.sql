/*
  # Create Test School and User Account

  1. Changes
    - Insert a test school
    - Create a test user account with hashed password
    - Link the user to the school

  2. Test Credentials
    Email: test@school.com
    Password: test123!
*/

-- Insert test school
INSERT INTO schools (id, name, website)
VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'Test School',
  'https://test-school.edu'
) ON CONFLICT (id) DO NOTHING;

-- Insert test user directly into auth.users
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
  last_sign_in_at
) VALUES (
  '123e4567-e89b-12d3-a456-426614174001',
  '00000000-0000-0000-0000-000000000000',
  'test@school.com',
  crypt('test123!', gen_salt('bf')),
  now(),
  jsonb_build_object(
    'provider', 'email',
    'providers', ARRAY['email']::text[],
    'school_id', '123e4567-e89b-12d3-a456-426614174000'
  ),
  jsonb_build_object(
    'school_id', '123e4567-e89b-12d3-a456-426614174000'
  ),
  now(),
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;