/*
  # Add content drafts table

  1. New Tables
    - `content_drafts`
      - `id` (uuid, primary key)
      - `school_id` (uuid, references schools)
      - `tone_profile_id` (uuid, references tone_profiles)
      - `title` (text)
      - `content` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on content_drafts table
    - Add policies for authenticated users to manage their school's drafts
*/

-- Check if content_drafts table exists, if not, create it
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'content_drafts') THEN
    CREATE TABLE content_drafts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id uuid REFERENCES schools(id),
      tone_profile_id uuid REFERENCES tone_profiles(id),
      title text NOT NULL,
      content text NOT NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Enable RLS (safe even if already enabled)
ALTER TABLE content_drafts ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'content_drafts' 
    AND policyname = 'Users can manage their school''s drafts'
  ) THEN
    DROP POLICY "Users can manage their school's drafts" ON content_drafts;
  END IF;
END $$;

-- Create policy
CREATE POLICY "Users can manage their school's drafts"
ON content_drafts
FOR ALL
TO authenticated
USING (
  school_id = (
    SELECT (raw_user_meta_data->>'school_id')::uuid
    FROM auth.users
    WHERE auth.uid() = id
  )
)
WITH CHECK (
  school_id = (
    SELECT (raw_user_meta_data->>'school_id')::uuid
    FROM auth.users
    WHERE auth.uid() = id
  )
);