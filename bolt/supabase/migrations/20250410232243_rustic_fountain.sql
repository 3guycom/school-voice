/*
  # Fix School Registration RLS Policies

  1. Changes
    - Drop existing policies that might be causing conflicts
    - Create new, simplified policies that allow public registration
    - Set up correct authenticated access control
    
  2. Security
    - Enable RLS on schools table
    - Allow public INSERT during registration (critical fix)
    - Restrict READ/UPDATE to school owners only
*/

-- Ensure RLS is enabled
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for schools table to start fresh
DROP POLICY IF EXISTS "enable_public_insert" ON schools;
DROP POLICY IF EXISTS "enable_public_registration" ON schools;
DROP POLICY IF EXISTS "enable_registration_insert" ON schools;
DROP POLICY IF EXISTS "users_can_read_own_school" ON schools;
DROP POLICY IF EXISTS "users_can_update_own_school" ON schools;

-- Create new policies for schools table
-- Allow public registration - critical for solving the RLS issue
CREATE POLICY "public_can_insert_schools" ON schools
FOR INSERT 
TO public
WITH CHECK (true);

-- Allow users to read only their own school
CREATE POLICY "users_can_read_own_school" ON schools
FOR SELECT 
TO authenticated
USING (
  id = (
    SELECT ((users.raw_user_meta_data ->> 'school_id'::text))::uuid
    FROM auth.users
    WHERE (auth.uid() = users.id)
  )
);

-- Allow users to update only their own school
CREATE POLICY "users_can_update_own_school" ON schools
FOR UPDATE 
TO authenticated
USING (
  id = (
    SELECT ((users.raw_user_meta_data ->> 'school_id'::text))::uuid
    FROM auth.users
    WHERE (auth.uid() = users.id)
  )
)
WITH CHECK (
  id = (
    SELECT ((users.raw_user_meta_data ->> 'school_id'::text))::uuid
    FROM auth.users
    WHERE (auth.uid() = users.id)
  )
);