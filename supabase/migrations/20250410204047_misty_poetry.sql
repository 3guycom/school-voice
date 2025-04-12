/*
  # Fix Authentication and Policies

  1. Changes
    - Update RLS policies to use correct metadata path
    - Recreate test user with proper metadata
    - Ensure email is confirmed
*/

-- First clean up existing test data
DELETE FROM auth.users WHERE email = 'test@school.com';
DELETE FROM schools WHERE id = '123e4567-e89b-12d3-a456-426614174000';

-- Recreate test school
INSERT INTO schools (id, name, website)
VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'Test School',
  'https://test-school.edu'
) ON CONFLICT (id) DO NOTHING;

-- Create test user with correct metadata
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
  now(),
  '',
  false,
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Update RLS policies to use correct metadata path
DROP POLICY IF EXISTS "enable_school_read" ON schools;
DROP POLICY IF EXISTS "enable_school_update" ON schools;

CREATE POLICY "enable_school_read"
ON schools
FOR SELECT
TO authenticated
USING (
  id = ((auth.jwt() ->> 'user_metadata'::text))::uuid
);

CREATE POLICY "enable_school_update"
ON schools
FOR UPDATE
TO authenticated
USING (
  id = ((auth.jwt() ->> 'user_metadata'::text))::uuid
)
WITH CHECK (
  id = ((auth.jwt() ->> 'user_metadata'::text))::uuid
);