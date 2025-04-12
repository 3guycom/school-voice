/*
  # Add INSERT policy for schools table

  1. Changes
    - Add INSERT policy to allow authenticated users to create schools
    
  2. Security
    - Allows authenticated users to create new schools
    - Maintains existing SELECT policy
*/

CREATE POLICY "Users can create schools"
  ON schools
  FOR INSERT
  TO authenticated
  WITH CHECK (true);