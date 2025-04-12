/*
  # Fix school_members RLS policy infinite recursion

  1. Changes
    - Fix the INSERT policy for school_members that was causing infinite recursion
    - Replace the problematic self-referencing condition with a proper check
    - Maintain the original intent of allowing either:
      a) First admin creation for a new school, or
      b) Existing admins adding members to their school
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can create initial admin or admins can add members" ON public.school_members;

-- Create the fixed policy
CREATE POLICY "Users can create initial admin or admins can add members" 
ON public.school_members
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Scenario 1: Creating the first admin for a new school
  ((user_id = auth.uid()) AND (role = 'admin') AND 
   (NOT EXISTS (SELECT 1 FROM school_members WHERE school_id = school_members.school_id)))
  OR 
  -- Scenario 2: Existing admin adding members to their school
  (school_id IN (
    SELECT sm.school_id
    FROM school_members sm
    WHERE (sm.user_id = auth.uid() AND sm.role = 'admin')
  ))
);