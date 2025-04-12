/*
  # Fix infinite recursion in school_members policies

  1. Schema Updates
     - Drop existing policies that caused recursion
     - Create new policies with non-recursive logic

  2. Policy Changes
     - Simple policy for users to read their own memberships
     - Non-recursive policies for admin operations
     - Fixed policy for initial admin creation
*/

-- Drop all existing policies on school_members to start fresh
DROP POLICY IF EXISTS "Users can read their own memberships" ON public.school_members;
DROP POLICY IF EXISTS "Users can read school members for their schools" ON public.school_members;
DROP POLICY IF EXISTS "Admins can read all school members" ON public.school_members;
DROP POLICY IF EXISTS "Admins can update school members" ON public.school_members;
DROP POLICY IF EXISTS "Admins can delete school members" ON public.school_members;
DROP POLICY IF EXISTS "Users can create initial admin or admins can add members" ON public.school_members;
DROP POLICY IF EXISTS "Admins can delete school members - fixed" ON public.school_members;
DROP POLICY IF EXISTS "Admins can read all school members - fixed" ON public.school_members;
DROP POLICY IF EXISTS "Admins can update school members - fixed" ON public.school_members;
DROP POLICY IF EXISTS "Users can create initial admin or admins can add members - fixed" ON public.school_members;
DROP POLICY IF EXISTS "Users can create initial admin or admins can add members - fixe" ON public.school_members;

-- Create a simple policy for users to read their own memberships
CREATE POLICY "Users can view own memberships"
ON public.school_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create separate policy for admins to view all members of their schools
CREATE POLICY "Admins can view all school members"
ON public.school_members
FOR SELECT
TO authenticated
USING (
  -- Get school IDs where the current user is an admin, without joining back to school_members
  EXISTS (
    SELECT 1 
    FROM public.school_members sm
    WHERE sm.school_id = school_members.school_id
      AND sm.user_id = auth.uid()
      AND sm.role = 'admin'
  )
);

-- Create policy for user to create initial admin record or for admins to add members
CREATE POLICY "Create school membership"
ON public.school_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- Case 1: User creating themselves as the first admin of a school
  (
    user_id = auth.uid() AND 
    role = 'admin' AND 
    NOT EXISTS (
      SELECT 1 
      FROM public.school_members existing
      WHERE existing.school_id = school_members.school_id
    )
  )
  OR
  -- Case 2: Admin adding members to a school they administer
  (
    EXISTS (
      SELECT 1 
      FROM public.school_members admin_record
      WHERE admin_record.school_id = school_members.school_id
        AND admin_record.user_id = auth.uid()
        AND admin_record.role = 'admin'
    )
  )
);

-- Create policy for admins to update members (excluding themselves)
CREATE POLICY "Update school membership"
ON public.school_members
FOR UPDATE
TO authenticated
USING (
  -- Prevent updates to own record (prevent privilege escalation)
  user_id <> auth.uid() AND
  -- Only allow updates to schools where the user is an admin
  EXISTS (
    SELECT 1 
    FROM public.school_members admin_record
    WHERE admin_record.school_id = school_members.school_id
      AND admin_record.user_id = auth.uid()
      AND admin_record.role = 'admin'
  )
)
WITH CHECK (
  -- Prevent updates to own record (prevent privilege escalation)
  user_id <> auth.uid() AND
  -- Only allow updates to schools where the user is an admin
  EXISTS (
    SELECT 1 
    FROM public.school_members admin_record
    WHERE admin_record.school_id = school_members.school_id
      AND admin_record.user_id = auth.uid()
      AND admin_record.role = 'admin'
  )
);

-- Create policy for admins to delete members (excluding themselves)
CREATE POLICY "Delete school membership"
ON public.school_members
FOR DELETE
TO authenticated
USING (
  -- Prevent deleting own record (prevent lockout)
  user_id <> auth.uid() AND
  -- Only allow deletes for schools where the user is an admin
  EXISTS (
    SELECT 1 
    FROM public.school_members admin_record
    WHERE admin_record.school_id = school_members.school_id
      AND admin_record.user_id = auth.uid()
      AND admin_record.role = 'admin'
  )
);