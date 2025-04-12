/*
  # Fresh Database Schema with Proper RLS

  1. New Tables
    - `schools` - Store school information
    - `tone_profiles` - Store tone analysis profiles
    - `content_drafts` - Store content creation drafts

  2. Security
    - Enable RLS on all tables
    - Public can create schools during registration
    - Authenticated users can only access their own school data
    - Proper metadata path for user school_id

  This migration provides a clean slate with correct policies from the beginning.
*/

-- First drop existing tables if they exist
DROP TABLE IF EXISTS content_drafts CASCADE;
DROP TABLE IF EXISTS tone_profiles CASCADE;
DROP TABLE IF EXISTS schools CASCADE;

-- Create schools table
CREATE TABLE schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  website text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tone_profiles table
CREATE TABLE tone_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id),
  name text NOT NULL,
  dimensions jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create content_drafts table
CREATE TABLE content_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id),
  tone_profile_id uuid REFERENCES tone_profiles(id),
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE tone_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_drafts ENABLE ROW LEVEL SECURITY;

-- Schools table policies
-- Critical: Allow public users to create schools during registration
CREATE POLICY "public_can_insert_schools"
  ON schools
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow authenticated users to read their own school
CREATE POLICY "users_can_read_own_school"
  ON schools
  FOR SELECT
  TO authenticated
  USING (
    id = (
      SELECT ((users.raw_user_meta_data ->> 'school_id'::text))::uuid AS uuid
      FROM auth.users
      WHERE (uid() = users.id)
    )
  );

-- Allow authenticated users to update their own school
CREATE POLICY "users_can_update_own_school"
  ON schools
  FOR UPDATE
  TO authenticated
  USING (
    id = (
      SELECT ((users.raw_user_meta_data ->> 'school_id'::text))::uuid AS uuid
      FROM auth.users
      WHERE (uid() = users.id)
    )
  )
  WITH CHECK (
    id = (
      SELECT ((users.raw_user_meta_data ->> 'school_id'::text))::uuid AS uuid
      FROM auth.users
      WHERE (uid() = users.id)
    )
  );

-- Tone profiles table policies
-- Allow authenticated users to create profiles for their school
CREATE POLICY "users_can_create_school_profiles"
  ON tone_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id = (
      SELECT ((users.raw_user_meta_data ->> 'school_id'::text))::uuid AS uuid
      FROM auth.users
      WHERE (uid() = users.id)
    )
  );

-- Allow authenticated users to read their school's profiles
CREATE POLICY "users_can_read_school_profiles"
  ON tone_profiles
  FOR SELECT
  TO authenticated
  USING (
    school_id = (
      SELECT ((users.raw_user_meta_data ->> 'school_id'::text))::uuid AS uuid
      FROM auth.users
      WHERE (uid() = users.id)
    )
  );

-- Content drafts table policies
-- Allow authenticated users to manage drafts for their school
CREATE POLICY "users_can_manage_drafts"
  ON content_drafts
  FOR ALL
  TO authenticated
  USING (
    school_id = (
      SELECT ((users.raw_user_meta_data ->> 'school_id'::text))::uuid AS uuid
      FROM auth.users
      WHERE (uid() = users.id)
    )
  )
  WITH CHECK (
    school_id = (
      SELECT ((users.raw_user_meta_data ->> 'school_id'::text))::uuid AS uuid
      FROM auth.users
      WHERE (uid() = users.id)
    )
  );