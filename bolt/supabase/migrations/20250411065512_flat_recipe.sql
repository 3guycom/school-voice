/*
  # Fix RLS policies for registration flow

  1. Changes
    - Remove all existing policies on schools table
    - Create a new public INSERT policy to ensure public registration works
    - Fix SELECT and UPDATE policies for authenticated users
    - Ensure correct security for content with updated RLS policies

  2. Security
    - Enables public registration (critical fix)
    - Maintains proper access control for authenticated users
    - Uses consistent pattern for accessing user metadata
*/

-- Drop existing policies
DROP POLICY IF EXISTS "public_can_insert_schools" ON schools;
DROP POLICY IF EXISTS "users_can_read_own_school" ON schools;
DROP POLICY IF EXISTS "users_can_update_own_school" ON schools;
DROP POLICY IF EXISTS "enable_public_insert" ON schools;
DROP POLICY IF EXISTS "enable_school_read" ON schools;
DROP POLICY IF EXISTS "enable_school_update" ON schools;

-- Re-create school insert policy for public users (critical fix)
CREATE POLICY "public_can_insert_schools" ON schools
FOR INSERT 
TO public
WITH CHECK (true);

-- Re-create school access policies for authenticated users
CREATE POLICY "users_can_read_own_school" ON schools
FOR SELECT 
TO authenticated
USING (
  id = (
    SELECT ((users.raw_user_meta_data ->> 'school_id'::text))::uuid AS uuid
    FROM auth.users
    WHERE (auth.uid() = users.id)
  )
);

CREATE POLICY "users_can_update_own_school" ON schools
FOR UPDATE 
TO authenticated
USING (
  id = (
    SELECT ((users.raw_user_meta_data ->> 'school_id'::text))::uuid AS uuid
    FROM auth.users
    WHERE (auth.uid() = users.id)
  )
)
WITH CHECK (
  id = (
    SELECT ((users.raw_user_meta_data ->> 'school_id'::text))::uuid AS uuid
    FROM auth.users
    WHERE (auth.uid() = users.id)
  )
);