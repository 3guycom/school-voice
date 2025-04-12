/*
  # Fix schools table RLS policies

  1. Changes
    - Drop existing INSERT policy that requires authentication
    - Add new INSERT policy that allows anyone to create a school
    - Keep existing SELECT and UPDATE policies unchanged

  2. Security
    - Allows public access for school creation during registration
    - Maintains secure access for reading and updating school data
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON schools;

-- Create new INSERT policy that allows public access
CREATE POLICY "Enable public insert for registration" 
ON schools
FOR INSERT 
TO public
WITH CHECK (true);