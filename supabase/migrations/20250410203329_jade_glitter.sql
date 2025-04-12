/*
  # Fix schools table RLS policies

  1. Changes
    - Drop existing INSERT policy that wasn't working correctly
    - Add new INSERT policy that properly enables school creation during registration
    - Keep existing SELECT and UPDATE policies unchanged

  2. Security
    - Allows public users to create schools during registration
    - Maintains existing policies for authenticated users to read and update their own school data
*/

-- Drop the existing problematic INSERT policy
DROP POLICY IF EXISTS "Enable public registration" ON schools;

-- Create new INSERT policy that properly enables school creation
CREATE POLICY "Enable school creation during registration" ON schools
FOR INSERT
TO public
WITH CHECK (true);