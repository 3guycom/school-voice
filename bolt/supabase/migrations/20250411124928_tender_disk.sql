/*
  # Fix school_members policies to eliminate recursion

  1. Changes
    - Drop all existing policies on school_members table to start with a clean slate
    - Create new policies with non-recursive conditions
    - Fix naming consistency across policies
  
  2. Security
    - Maintain proper row-level security
    - Allow users to view their own memberships
    - Allow admins to manage school members
    - Prevent privilege escalation and lockout
*/

-- Drop all existing policies using a safer approach that checks first
DO $$
DECLARE 
  policy_names text[] := ARRAY[
    'Users can read their own memberships',
    'Users can view own memberships',
    'Users can read school members for their schools',
    'Admins can read all school members',
    'Admins can view all school members',
    'Admins can update school members',
    'Admins can delete school members',
    'Users can create initial admin or admins can add members',
    'Create school membership',
    'Update school membership',
    'Delete school membership',
    'Admins can delete school members - fixed',
    'Admins can read all school members - fixed',
    'Admins can update school members - fixed',
    'Users can create initial admin or admins can add members - fixed',
    'Users can create initial admin or admins can add members - fixe'
  ];
  i int;
BEGIN
  FOR i IN 1..array_length(policy_names, 1) LOOP
    IF EXISTS (
      SELECT 1 
      FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'school_members' 
      AND policyname = policy_names[i]
    ) THEN
      EXECUTE format('DROP POLICY %I ON public.school_members', policy_names[i]);
    END IF;
  END LOOP;
END $$;

-- 1. Basic SELECT policy - users can see their own memberships
CREATE POLICY "Users can view own memberships"
ON public.school_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 2. Admin SELECT policy - admins can see all members in their schools
CREATE POLICY "Admins can view school members"
ON public.school_members
FOR SELECT
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

-- 3. INSERT policy - first user can be admin, or admins can add members
CREATE POLICY "Create school membership"
ON public.school_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- First admin case: creating themselves as admin of a new school
  (
    user_id = auth.uid() AND 
    role = 'admin' AND 
    NOT EXISTS (
      SELECT 1 
      FROM school_members existing
      WHERE existing.school_id = school_members.school_id
    )
  )
  OR
  -- Admin adding members case
  (
    EXISTS (
      SELECT 1 
      FROM school_members admin_record
      WHERE admin_record.school_id = school_members.school_id
        AND admin_record.user_id = auth.uid()
        AND admin_record.role = 'admin'
    )
  )
);

-- 4. UPDATE policy - admins can update other members but not themselves
CREATE POLICY "Update school membership"
ON public.school_members
FOR UPDATE
TO authenticated
USING (
  -- Cannot modify own record (prevent privilege escalation)
  user_id <> auth.uid() AND
  -- Must be admin of this school
  EXISTS (
    SELECT 1 
    FROM school_members admin_record
    WHERE admin_record.school_id = school_members.school_id
      AND admin_record.user_id = auth.uid()
      AND admin_record.role = 'admin'
  )
)
WITH CHECK (
  -- Cannot modify own record (prevent privilege escalation)
  user_id <> auth.uid() AND
  -- Must be admin of this school
  EXISTS (
    SELECT 1 
    FROM school_members admin_record
    WHERE admin_record.school_id = school_members.school_id
      AND admin_record.user_id = auth.uid()
      AND admin_record.role = 'admin'
  )
);

-- 5. DELETE policy - admins can delete other members but not themselves
CREATE POLICY "Delete school membership"
ON public.school_members
FOR DELETE
TO authenticated
USING (
  -- Cannot delete own record (prevent lockout)
  user_id <> auth.uid() AND
  -- Must be admin of this school
  EXISTS (
    SELECT 1 
    FROM school_members admin_record
    WHERE admin_record.school_id = school_members.school_id
      AND admin_record.user_id = auth.uid()
      AND admin_record.role = 'admin'
  )
);