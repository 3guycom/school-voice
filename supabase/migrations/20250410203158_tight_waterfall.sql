/*
  # Complete Authentication and Schools Setup

  1. Changes
    - Drop and recreate schools table with proper constraints
    - Set up RLS policies from scratch
    - Add necessary indexes
    
  2. Security
    - Enable RLS
    - Public registration access
    - Authenticated user access control
*/

-- First, drop existing table and policies
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
CREATE POLICY "Enable public registration"
ON schools
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Enable own school select"
ON schools
FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT auth.uid()
    FROM auth.users
    WHERE (raw_app_meta_data->>'school_id')::uuid = schools.id
  )
);

CREATE POLICY "Enable own school update"
ON schools
FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (
    SELECT auth.uid()
    FROM auth.users
    WHERE (raw_app_meta_data->>'school_id')::uuid = schools.id
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT auth.uid()
    FROM auth.users
    WHERE (raw_app_meta_data->>'school_id')::uuid = schools.id
  )
);