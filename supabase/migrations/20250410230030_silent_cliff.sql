/*
  # Fix schools table RLS policies

  1. Changes
    - Remove existing public registration policy that wasn't working
    - Add new policy to allow public registration without restrictions
    - Keep existing policies for authenticated users to read/update their school

  2. Security
    - Public users can create schools during registration
    - Authenticated users can only read/update their own school
    - No deletion policy (schools cannot be deleted)
*/

-- Drop the existing public registration policy that isn't working
DROP POLICY IF EXISTS "enable_public_registration" ON schools;

-- Create new policy to allow public registration
CREATE POLICY "enable_public_registration" ON schools
FOR INSERT 
TO public
WITH CHECK (true);

-- Note: Keeping existing policies:
-- - "enable_school_read" for authenticated users to read their school
-- - "enable_school_update" for authenticated users to update their school