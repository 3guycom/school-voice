/*
  # Fix schools table RLS policies

  1. Changes
    - Remove existing RLS policies for schools table
    - Add new policies that allow:
      - Public users to create schools during registration
      - Authenticated users to read/update their own school
      - No deletion allowed (protected by lack of policy)
  
  2. Security
    - Maintains data isolation between schools
    - Prevents unauthorized access to school data
    - Allows registration flow to work properly
*/

-- Drop existing policies
DROP POLICY IF EXISTS "enable_registration_insert" ON schools;
DROP POLICY IF EXISTS "enable_school_read" ON schools;
DROP POLICY IF EXISTS "enable_school_update" ON schools;

-- Create new policies
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
    SELECT ((users.raw_user_meta_data ->> 'school_id'::text))::uuid 
    FROM auth.users 
    WHERE auth.uid() = users.id
  )
);

CREATE POLICY "users_can_update_own_school" 
ON schools
FOR UPDATE 
TO authenticated
USING (
  id = ( 
    SELECT ((users.raw_user_meta_data ->> 'school_id'::text))::uuid 
    FROM auth.users 
    WHERE auth.uid() = users.id
  )
)
WITH CHECK (
  id = ( 
    SELECT ((users.raw_user_meta_data ->> 'school_id'::text))::uuid 
    FROM auth.users 
    WHERE auth.uid() = users.id
  )
);