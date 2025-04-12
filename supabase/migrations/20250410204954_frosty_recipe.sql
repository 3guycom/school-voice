/*
  # Update tone profiles RLS policies

  1. Changes
    - Update RLS policies for tone_profiles table to use correct JWT metadata path
    - Fix permission denied error by using proper auth.jwt() function
    - Ensure consistent school_id access pattern across tables

  2. Security
    - Maintain row-level security while fixing permission issues
    - Use consistent pattern for accessing user metadata
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create tone profiles for their school" ON tone_profiles;
DROP POLICY IF EXISTS "Users can read their school's tone profiles" ON tone_profiles;

-- Create new policies using correct JWT metadata path
CREATE POLICY "Users can create tone profiles for their school"
ON tone_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  school_id = ((auth.jwt() -> 'user_metadata' ->> 'school_id')::uuid)
);

CREATE POLICY "Users can read their school's tone profiles"
ON tone_profiles
FOR SELECT
TO authenticated
USING (
  school_id = ((auth.jwt() -> 'user_metadata' ->> 'school_id')::uuid)
);