/*
  # Reset and simplify authentication system
  
  1. Changes
    - Drop all existing policies
    - Recreate schools table with simplified structure
    - Create clear, simple policies for registration and access
    
  2. Security
    - Public can create schools during registration
    - Users can only access their own school data
    - Clean separation between public and authenticated access
*/

-- First, drop existing table and policies to start fresh
DROP TABLE IF EXISTS schools CASCADE;

-- Recreate schools table with simplified structure
CREATE TABLE schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  website text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- Create simplified policies
CREATE POLICY "Allow public registration"
ON schools
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow users to read own school"
ON schools
FOR SELECT
TO authenticated
USING (
  id = (auth.jwt() ->> 'school_id')::uuid
);

CREATE POLICY "Allow users to update own school"
ON schools
FOR UPDATE
TO authenticated
USING (
  id = (auth.jwt() ->> 'school_id')::uuid
)
WITH CHECK (
  id = (auth.jwt() ->> 'school_id')::uuid
);