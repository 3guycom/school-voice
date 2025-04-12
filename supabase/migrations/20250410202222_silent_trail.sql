/*
  # Fix schools table RLS policies

  1. Changes
    - Drop existing policies that reference the non-existent users table
    - Create new policies that use auth.users instead
    - Add policies for authenticated users to create and manage schools

  2. Security
    - Enable insert for authenticated users during registration
    - Allow users to read and update their associated school
    - Maintain data isolation between different schools
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create schools" ON schools;
DROP POLICY IF EXISTS "Users can read their school" ON schools;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON schools;
DROP POLICY IF EXISTS "Enable select for users with matching school_id" ON schools;
DROP POLICY IF EXISTS "Enable update for users with matching school_id" ON schools;

-- Create new policies using auth.users
CREATE POLICY "Enable insert for authenticated users" 
ON schools
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Enable select for users with matching school_id" 
ON schools
FOR SELECT 
TO authenticated
USING (
  id = (
    SELECT (raw_user_meta_data->>'school_id')::uuid
    FROM auth.users
    WHERE auth.uid() = id
  )
);

CREATE POLICY "Enable update for users with matching school_id" 
ON schools
FOR UPDATE 
TO authenticated
USING (
  id = (
    SELECT (raw_user_meta_data->>'school_id')::uuid
    FROM auth.users
    WHERE auth.uid() = id
  )
)
WITH CHECK (
  id = (
    SELECT (raw_user_meta_data->>'school_id')::uuid
    FROM auth.users
    WHERE auth.uid() = id
  )
);