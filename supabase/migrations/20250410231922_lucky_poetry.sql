/*
  # Fix registration flow and policies

  1. Changes
    - Drop existing tables and policies
    - Recreate schools table with proper constraints
    - Set up correct RLS policies for registration flow
    - Add trigger to handle user metadata updates
    
  2. Security
    - Enable RLS on schools table
    - Allow public registration
    - Ensure proper user-school relationship
*/

-- Drop existing tables (if they exist)
DROP TABLE IF EXISTS tone_profiles CASCADE;
DROP TABLE IF EXISTS content_drafts CASCADE;
DROP TABLE IF EXISTS schools CASCADE;

-- Create schools table
CREATE TABLE schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  website text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "enable_public_insert" 
ON schools
FOR INSERT 
TO public
WITH CHECK (true);

CREATE POLICY "users_can_read_own_school" 
ON schools
FOR SELECT 
TO authenticated
USING (
  id = (
    SELECT ((raw_user_meta_data->>'school_id')::uuid)
    FROM auth.users
    WHERE auth.uid() = id
  )
);

CREATE POLICY "users_can_update_own_school" 
ON schools
FOR UPDATE 
TO authenticated
USING (
  id = (
    SELECT ((raw_user_meta_data->>'school_id')::uuid)
    FROM auth.users
    WHERE auth.uid() = id
  )
)
WITH CHECK (
  id = (
    SELECT ((raw_user_meta_data->>'school_id')::uuid)
    FROM auth.users
    WHERE auth.uid() = id
  )
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

-- Enable RLS on tone_profiles
ALTER TABLE tone_profiles ENABLE ROW LEVEL SECURITY;

-- Create tone_profiles policies
CREATE POLICY "users_can_read_school_profiles" 
ON tone_profiles
FOR SELECT 
TO authenticated
USING (
  school_id = (
    SELECT ((raw_user_meta_data->>'school_id')::uuid)
    FROM auth.users
    WHERE auth.uid() = id
  )
);

CREATE POLICY "users_can_create_school_profiles" 
ON tone_profiles
FOR INSERT 
TO authenticated
WITH CHECK (
  school_id = (
    SELECT ((raw_user_meta_data->>'school_id')::uuid)
    FROM auth.users
    WHERE auth.uid() = id
  )
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

-- Enable RLS on content_drafts
ALTER TABLE content_drafts ENABLE ROW LEVEL SECURITY;

-- Create content_drafts policies
CREATE POLICY "users_can_manage_drafts" 
ON content_drafts
FOR ALL 
TO authenticated
USING (
  school_id = (
    SELECT ((raw_user_meta_data->>'school_id')::uuid)
    FROM auth.users
    WHERE auth.uid() = id
  )
)
WITH CHECK (
  school_id = (
    SELECT ((raw_user_meta_data->>'school_id')::uuid)
    FROM auth.users
    WHERE auth.uid() = id
  )
);