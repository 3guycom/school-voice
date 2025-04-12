/*
  # Fix school policies and metadata access

  1. Changes
    - Update policies to use correct metadata path
    - Fix school access policies
    - Add proper metadata handling

  2. Security
    - Maintain RLS enabled
    - Use correct metadata path for school_id
    - Ensure proper access control
*/

-- Drop existing policies
DROP POLICY IF EXISTS "enable_school_read" ON schools;
DROP POLICY IF EXISTS "enable_school_update" ON schools;
DROP POLICY IF EXISTS "enable_public_registration" ON schools;

-- Create new policies with correct metadata path
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
  id = (
    SELECT ((raw_user_meta_data ->> 'school_id'::text))::uuid
    FROM auth.users
    WHERE auth.uid() = id
  )
);

CREATE POLICY "enable_school_update"
ON schools
FOR UPDATE
TO authenticated
USING (
  id = (
    SELECT ((raw_user_meta_data ->> 'school_id'::text))::uuid
    FROM auth.users
    WHERE auth.uid() = id
  )
)
WITH CHECK (
  id = (
    SELECT ((raw_user_meta_data ->> 'school_id'::text))::uuid
    FROM auth.users
    WHERE auth.uid() = id
  )
);