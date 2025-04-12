/*
  # Fix schools table RLS policies

  1. Changes
    - Drop existing INSERT policy that isn't working correctly
    - Create new INSERT policy for public access during registration
    - Ensure policy allows new school creation without requiring authentication

  2. Security
    - Maintains RLS enabled on schools table
    - Allows public INSERT for registration process
    - Maintains existing SELECT and UPDATE policies for authenticated users
*/

-- Drop the existing INSERT policy that's not working
DROP POLICY IF EXISTS "Enable public insert for registration" ON schools;

-- Create new INSERT policy that properly allows public registration
CREATE POLICY "Enable public insert for registration" 
ON schools
FOR INSERT 
TO public
WITH CHECK (true);