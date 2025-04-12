/*
  # Initial schema setup for School Voice application

  1. New Tables
    - Handles existing `schools` table
    - Adds `tone_profiles` table if it doesn't exist
    - Adds school_id to auth.users if not already present

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Check if schools table exists, if not, create it
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'schools') THEN
    CREATE TABLE schools (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      website text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Add school_id to auth.users if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'school_id'
  ) THEN
    ALTER TABLE auth.users 
      ADD COLUMN school_id uuid REFERENCES schools(id);
  END IF;
END $$;

-- Create tone_profiles table if not exists
CREATE TABLE IF NOT EXISTS tone_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id),
  name text NOT NULL,
  dimensions jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS (safe to run even if already enabled)
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE tone_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'schools' AND policyname = 'Users can read their school'
  ) THEN
    DROP POLICY "Users can read their school" ON schools;
  END IF;
  
  IF EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'tone_profiles' AND policyname = 'Users can read their school''s tone profiles'
  ) THEN
    DROP POLICY "Users can read their school's tone profiles" ON tone_profiles;
  END IF;
  
  IF EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'tone_profiles' AND policyname = 'Users can create tone profiles for their school'
  ) THEN
    DROP POLICY "Users can create tone profiles for their school" ON tone_profiles;
  END IF;
END $$;

-- Create policies
CREATE POLICY "Users can read their school"
  ON schools
  FOR SELECT
  TO authenticated
  USING (id = (
    SELECT school_id FROM auth.users WHERE auth.uid() = id
  ));

CREATE POLICY "Users can read their school's tone profiles"
  ON tone_profiles
  FOR SELECT
  TO authenticated
  USING (school_id = (
    SELECT school_id FROM auth.users WHERE auth.uid() = id
  ));

CREATE POLICY "Users can create tone profiles for their school"
  ON tone_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (school_id = (
    SELECT school_id FROM auth.users WHERE auth.uid() = id
  ));