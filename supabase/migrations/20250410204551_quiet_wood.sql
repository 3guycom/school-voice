/*
  # Fix Authentication Setup

  1. Changes
    - Clean up all test data
    - Recreate schools table with proper structure
    - Set up correct RLS policies using proper JWT claims
    - Create test user with correct metadata structure
    - Add proper identity record

  2. Security
    - Enables RLS on schools table
    - Sets up proper policies for school access
    - Uses correct metadata paths in JWT claims
*/

-- First clean up all test data
DELETE FROM auth.identities WHERE user_id = '123e4567-e89b-12d3-a456-426614174001';
DELETE FROM auth.users WHERE email = 'test@school.com';
DROP TABLE IF EXISTS schools CASCADE;

-- Recreate schools table
CREATE TABLE schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  website text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- Create proper policies using correct JWT claims
CREATE POLICY "enable_public_registration"
ON schools
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "enable_school_read"
ON schools
FOR SELECT
TO authenticated
USING (
  id = ((auth.jwt() -> 'user_metadata' ->> 'school_id')::uuid)
);

CREATE POLICY "enable_school_update"
ON schools
FOR UPDATE
TO authenticated
USING (
  id = ((auth.jwt() -> 'user_metadata' ->> 'school_id')::uuid)
)
WITH CHECK (
  id = ((auth.jwt() -> 'user_metadata' ->> 'school_id')::uuid)
);

-- Create test school
INSERT INTO schools (id, name, website)
VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'Test School',
  'https://test-school.edu'
) ON CONFLICT (id) DO NOTHING;

-- Create test user with proper metadata structure
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
  recovery_token,
  is_super_admin,
  role
) VALUES (
  '123e4567-e89b-12d3-a456-426614174001',
  '00000000-0000-0000-0000-000000000000',
  'test@school.com',
  crypt('test123!', gen_salt('bf', 10)),
  now(),
  jsonb_build_object(
    'provider', 'email',
    'providers', ARRAY['email']::text[]
  ),
  jsonb_build_object(
    'school_id', '123e4567-e89b-12d3-a456-426614174000'
  ),
  now(),
  now(),
  now(),
  '',
  '',
  false,
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Create identity record with proper provider_id
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
  '123e4567-e89b-12d3-a456-426614174001',
  '123e4567-e89b-12d3-a456-426614174001',
  jsonb_build_object(
    'sub', '123e4567-e89b-12d3-a456-426614174001',
    'email', 'test@school.com'
  ),
  'email',
  'test@school.com',
  now(),
  now(),
  now()
) ON CONFLICT (provider_id, provider) DO NOTHING;