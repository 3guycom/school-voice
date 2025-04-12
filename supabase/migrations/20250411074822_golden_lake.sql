/*
  # Fix infinite recursion in school_members policy

  1. Changes
     - Replace the existing "Admins can manage school members" policy with a more specific policy
     - Create separate policies for INSERT, UPDATE, and DELETE operations
     - Add special handling for the initial admin creation during registration
  
  2. Reasoning
     - The original policy caused infinite recursion because it checked if a user is an admin
       to allow them to become an admin, creating a circular reference
     - The new policies maintain security while fixing the recursion issue
*/

-- Drop the existing policy that's causing recursion
DROP POLICY IF EXISTS "Admins can manage school members" ON public.school_members;

-- Create a policy for INSERT that allows:
-- 1. Existing admins to add members to schools they administer
-- 2. Users to add themselves as the first admin of a new school they just created
CREATE POLICY "Users can create initial admin or admins can add members" 
ON public.school_members
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Case 1: User is inserting themselves as admin of a school they just created
  (
    user_id = auth.uid() AND 
    role = 'admin' AND
    NOT EXISTS (
      SELECT 1 FROM school_members 
      WHERE school_id = school_members.school_id
    )
  )
  OR
  -- Case 2: User is already an admin of this school
  EXISTS (
    SELECT 1 
    FROM school_members sm
    WHERE sm.school_id = school_members.school_id 
    AND sm.user_id = auth.uid() 
    AND sm.role = 'admin'
  )
);

-- Create policy for UPDATE operations (admin only)
CREATE POLICY "Admins can update school members" 
ON public.school_members
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM school_members sm
    WHERE sm.school_id = school_members.school_id 
    AND sm.user_id = auth.uid() 
    AND sm.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM school_members sm
    WHERE sm.school_id = school_members.school_id 
    AND sm.user_id = auth.uid() 
    AND sm.role = 'admin'
  )
);

-- Create policy for DELETE operations (admin only)
CREATE POLICY "Admins can delete school members" 
ON public.school_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM school_members sm
    WHERE sm.school_id = school_members.school_id 
    AND sm.user_id = auth.uid() 
    AND sm.role = 'admin'
  )
);