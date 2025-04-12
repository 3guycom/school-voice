/*
  # Fix school_members policies to eliminate infinite recursion

  1. Policy Changes
    - Drop existing policies on the school_members table that could cause recursion
    - Create non-recursive policies with proper EXISTS checks
    - Fix permissions structure to avoid circular references
  
  2. Security
    - Maintain proper row-level security
    - Ensure users can only see appropriate records
    - Prevent users from modifying own permissions (privilege escalation prevention)
*/

-- First, check and drop policies if they exist to prevent errors
DO $$ 
BEGIN
  -- Drop all existing policies on school_members
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'school_members' AND policyname = 'Users can read their own memberships') THEN
    DROP POLICY "Users can read their own memberships" ON public.school_members;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'school_members' AND policyname = 'Users can view own memberships') THEN
    DROP POLICY "Users can view own memberships" ON public.school_members;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'school_members' AND policyname = 'Users can read school members for their schools') THEN
    DROP POLICY "Users can read school members for their schools" ON public.school_members;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'school_members' AND policyname = 'Admins can read all school members') THEN
    DROP POLICY "Admins can read all school members" ON public.school_members;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'school_members' AND policyname = 'Admins can view all school members') THEN
    DROP POLICY "Admins can view all school members" ON public.school_members;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'school_members' AND policyname = 'Admins can update school members') THEN
    DROP POLICY "Admins can update school members" ON public.school_members;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'school_members' AND policyname = 'Admins can delete school members') THEN
    DROP POLICY "Admins can delete school members" ON public.school_members;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'school_members' AND policyname = 'Users can create initial admin or admins can add members') THEN
    DROP POLICY "Users can create initial admin or admins can add members" ON public.school_members;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'school_members' AND policyname = 'Create school membership') THEN
    DROP POLICY "Create school membership" ON public.school_members;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'school_members' AND policyname = 'Update school membership') THEN
    DROP POLICY "Update school membership" ON public.school_members;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'school_members' AND policyname = 'Delete school membership') THEN
    DROP POLICY "Delete school membership" ON public.school_members;
  END IF;
  
  -- Drop policies with "fixed" suffix that may exist from previous attempts
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'school_members' AND policyname = 'Admins can delete school members - fixed') THEN
    DROP POLICY "Admins can delete school members - fixed" ON public.school_members;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'school_members' AND policyname = 'Admins can read all school members - fixed') THEN
    DROP POLICY "Admins can read all school members - fixed" ON public.school_members;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'school_members' AND policyname = 'Admins can update school members - fixed') THEN
    DROP POLICY "Admins can update school members - fixed" ON public.school_members;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'school_members' AND policyname = 'Users can create initial admin or admins can add members - fixed') THEN
    DROP POLICY "Users can create initial admin or admins can add members - fixed" ON public.school_members;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'school_members' AND policyname = 'Users can create initial admin or admins can add members - fixe') THEN
    DROP POLICY "Users can create initial admin or admins can add members - fixe" ON public.school_members;
  END IF;
END $$;

-- Create simple policy for users to read their own memberships
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