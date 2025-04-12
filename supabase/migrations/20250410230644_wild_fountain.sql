/*
  # Fix schools table RLS policies

  1. Changes
    - Drop existing RLS policies for schools table
    - Add new policies that properly handle school creation during registration
    - Ensure authenticated users can manage their own school

  2. Security
    - Allow public users to create schools during registration
    - Restrict school management to authenticated users who belong to that school
*/

-- Drop existing policies
DROP POLICY IF EXISTS "enable_public_registration" ON schools;
DROP POLICY IF EXISTS "enable_school_read" ON schools;
DROP POLICY IF EXISTS "enable_school_update" ON schools;

-- Create new policies
CREATE POLICY "enable_registration_insert" ON schools
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "enable_school_read" ON schools
  FOR SELECT
  TO authenticated
  USING (
    id = (
      SELECT ((users.raw_user_meta_data->>'school_id')::uuid)
      FROM auth.users
      WHERE auth.uid() = users.id
    )
  );

CREATE POLICY "enable_school_update" ON schools
  FOR UPDATE
  TO authenticated
  USING (
    id = (
      SELECT ((users.raw_user_meta_data->>'school_id')::uuid)
      FROM auth.users
      WHERE auth.uid() = users.id
    )
  )
  WITH CHECK (
    id = (
      SELECT ((users.raw_user_meta_data->>'school_id')::uuid)
      FROM auth.users
      WHERE auth.uid() = users.id
    )
  );