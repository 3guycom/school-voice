/*
  # Fix School Registration RLS Policies

  1. Changes
    - Drop existing policies that are causing registration issues
    - Create new simplified policies that:
      - Allow public registration without restrictions
      - Maintain secure access for authenticated users
    
  2. Security
    - Enable public INSERT for registration
    - Restrict SELECT/UPDATE to school owners only
    - Use correct metadata path for user school_id
*/

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "enable_registration_insert" ON schools;
DROP POLICY IF EXISTS "enable_school_read" ON schools;
DROP POLICY IF EXISTS "enable_school_update" ON schools;

-- Create new simplified policies
CREATE POLICY "enable_registration_insert"
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
    SELECT ((raw_user_meta_data->>'school_id')::uuid)
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