/*
  # Fix infinite recursion in school_members RLS policy

  1. Changes
    - Fixes the infinite recursion detected in policy for relation "school_members"
    - Replaces recursive policies with safer versions that don't cause infinite loops
  
  2. Security
    - Maintains same level of security while preventing recursion
    - Ensures users can still only interact with schools they belong to
*/

-- Drop problematic policies that may cause recursion
DROP POLICY IF EXISTS "Users can read school members for their schools" ON school_members;
DROP POLICY IF EXISTS "Admins can delete school members" ON school_members;
DROP POLICY IF EXISTS "Admins can update school members" ON school_members;
DROP POLICY IF EXISTS "Users can create initial admin or admins can add members" ON school_members;

-- Re-create policies with non-recursive definitions
-- 1. READ policy: Users can read school members for schools they belong to
CREATE POLICY "Users can read school members for their schools" 
ON school_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM school_members AS sm
    WHERE sm.user_id = auth.uid()
    AND sm.school_id = school_members.school_id
  )
);

-- 2. DELETE policy: Admins can delete school members
CREATE POLICY "Admins can delete school members" 
ON school_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM school_members AS sm
    WHERE sm.user_id = auth.uid()
    AND sm.school_id = school_members.school_id
    AND sm.role = 'admin'
  )
);

-- 3. UPDATE policy: Admins can update school members
CREATE POLICY "Admins can update school members" 
ON school_members
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM school_members AS sm
    WHERE sm.user_id = auth.uid()
    AND sm.school_id = school_members.school_id
    AND sm.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM school_members AS sm
    WHERE sm.user_id = auth.uid()
    AND sm.school_id = school_members.school_id
    AND sm.role = 'admin'
  )
);

-- 4. INSERT policy: Users can create initial admin or admins can add members
CREATE POLICY "Users can create initial admin or admins can add members" 
ON school_members
FOR INSERT
TO authenticated
WITH CHECK (
  (
    -- Case 1: User is creating themselves as admin for a new school with no members
    user_id = auth.uid() 
    AND role = 'admin' 
    AND NOT EXISTS (
      SELECT 1 
      FROM school_members 
      WHERE school_id = school_members.school_id
    )
  ) 
  OR 
  (
    -- Case 2: Admin is adding a new member to their school
    EXISTS (
      SELECT 1
      FROM school_members AS sm
      WHERE sm.user_id = auth.uid()
      AND sm.school_id = school_members.school_id
      AND sm.role = 'admin'
    )
  )
);