-- This migration is only applied if the previous one worked properly
-- First let's make sure the schools table exists and has the right structure
ALTER TABLE IF EXISTS schools 
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

-- Re-enable RLS with proper policies
-- We disabled it in the previous migration as a failsafe
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- Ensure proper policies exist
DROP POLICY IF EXISTS "public_can_insert_schools" ON schools;
CREATE POLICY "public_can_insert_schools" ON schools
FOR INSERT 
TO public
WITH CHECK (true);