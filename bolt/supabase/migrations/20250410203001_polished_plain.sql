/*
  # Fix Schools Table RLS Policies

  1. Changes
    - Drop existing RLS policies for schools table
    - Create new policies that:
      - Allow public registration (INSERT)
      - Allow authenticated users to view their own school
      - Allow authenticated users to update their own school
    
  2. Security
    - Maintains RLS enabled
    - Ensures users can only access their own school data
    - Allows public registration for new schools
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable public insert for registration" ON schools;
DROP POLICY IF EXISTS "Enable select for users with matching school_id" ON schools;
DROP POLICY IF EXISTS "Enable update for users with matching school_id" ON schools;

-- Create new policies
CREATE POLICY "Enable public insert for registration"
ON schools
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Users can view their own school"
ON schools
FOR SELECT
TO authenticated
USING (
  id = (
    SELECT ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'school_id')::uuid
  )
);

CREATE POLICY "Users can update their own school"
ON schools
FOR UPDATE
TO authenticated
USING (
  id = (
    SELECT ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'school_id')::uuid
  )
)
WITH CHECK (
  id = (
    SELECT ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'school_id')::uuid
  )
);