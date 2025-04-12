/*
  # Fix School Registration Flow

  1. Changes
    - Drop existing schools table and recreate with proper structure
    - Set up correct RLS policies for registration flow
    - Ensure public can create schools during registration
    - Maintain proper access control for authenticated users

  2. Security
    - Enable RLS on schools table
    - Allow public registration
    - Restrict read/update access to school owners
*/

-- Drop existing table and policies
DROP TABLE IF EXISTS schools CASCADE;

-- Recreate schools table
CREATE TABLE schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  website text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "enable_public_registration"
ON schools
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "enable_school_read"
ON schools
FOR SELECT
TO authenticated
USING (
  id = (auth.jwt() ->> 'school_id')::uuid
);

CREATE POLICY "enable_school_update"
ON schools
FOR UPDATE
TO authenticated
USING (
  id = (auth.jwt() ->> 'school_id')::uuid
)
WITH CHECK (
  id = (auth.jwt() ->> 'school_id')::uuid
);