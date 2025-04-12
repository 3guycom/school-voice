/*
  # Fix school policies and metadata access

  1. Changes
    - Update policies to use correct metadata path
    - Fix school access policies
    - Ensure proper metadata handling
*/

-- Drop existing policies
DROP POLICY IF EXISTS "enable_school_read" ON schools;
DROP POLICY IF EXISTS "enable_school_update" ON schools;

-- Create new policies with correct metadata path
CREATE POLICY "enable_school_read"
ON schools
FOR SELECT
TO authenticated
USING (
  id = ( SELECT ((users.raw_user_meta_data ->> 'school_id'::text))::uuid AS uuid
   FROM auth.users
  WHERE (auth.uid() = users.id))
);

CREATE POLICY "enable_school_update"
ON schools
FOR UPDATE
TO authenticated
USING (
  id = ( SELECT ((users.raw_user_meta_data ->> 'school_id'::text))::uuid AS uuid
   FROM auth.users
  WHERE (auth.uid() = users.id))
)
WITH CHECK (
  id = ( SELECT ((users.raw_user_meta_data ->> 'school_id'::text))::uuid AS uuid
   FROM auth.users
  WHERE (auth.uid() = users.id))
);