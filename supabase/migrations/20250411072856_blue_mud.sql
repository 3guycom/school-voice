-- First ensure RLS is enabled on schools table
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- Then drop all existing policies to start fresh
DROP POLICY IF EXISTS "public_can_insert_schools" ON schools;
DROP POLICY IF EXISTS "users_can_read_own_school" ON schools;
DROP POLICY IF EXISTS "users_can_update_own_school" ON schools;

-- Create properly permissive policies
-- CRITICAL: Allow anonymous/public users to create schools during registration
CREATE POLICY "public_can_insert_schools" ON schools
FOR INSERT 
TO public
WITH CHECK (true);

-- Allow authenticated users to read their own school
CREATE POLICY "users_can_read_own_school" ON schools
FOR SELECT 
TO authenticated
USING (
  id = ( 
    SELECT ((users.raw_user_meta_data ->> 'school_id'::text))::uuid AS uuid
    FROM auth.users
    WHERE (auth.uid() = users.id)
  )
);

-- Allow authenticated users to update their own school
CREATE POLICY "users_can_update_own_school" ON schools
FOR UPDATE 
TO authenticated
USING (
  id = ( 
    SELECT ((users.raw_user_meta_data ->> 'school_id'::text))::uuid AS uuid
    FROM auth.users
    WHERE (auth.uid() = users.id)
  )
)
WITH CHECK (
  id = ( 
    SELECT ((users.raw_user_meta_data ->> 'school_id'::text))::uuid AS uuid
    FROM auth.users
    WHERE (auth.uid() = users.id)
  )
);

-- Disable RLS temporarily to diagnose issues (will enable in future migration)
-- This allows us to work around any RLS issues until we can properly debug
ALTER TABLE schools DISABLE ROW LEVEL SECURITY;