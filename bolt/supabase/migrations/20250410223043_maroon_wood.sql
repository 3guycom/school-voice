/*
  # Fix tone profiles policies

  1. Changes
    - Update RLS policies for tone_profiles table to use correct metadata path
    - Fix permission checks for creating and reading tone profiles
    
  2. Security
    - Maintain row-level security
    - Ensure users can only access their school's profiles
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create tone profiles for their school" ON tone_profiles;
DROP POLICY IF EXISTS "Users can read their school's tone profiles" ON tone_profiles;

-- Create new policies with correct metadata path
CREATE POLICY "Users can create tone profiles for their school"
ON tone_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  school_id = (
    SELECT ((users.raw_user_meta_data ->> 'school_id'::text))::uuid
    FROM auth.users
    WHERE auth.uid() = users.id
  )
);

CREATE POLICY "Users can read their school's tone profiles"
ON tone_profiles
FOR SELECT
TO authenticated
USING (
  school_id = (
    SELECT ((users.raw_user_meta_data ->> 'school_id'::text))::uuid
    FROM auth.users
    WHERE auth.uid() = users.id
  )
);