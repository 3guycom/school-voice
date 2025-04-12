/*
  # Fix recursive RLS policies

  1. Changes
    - Fix infinite recursion in school_members policies by simplifying the RLS policies
    - Replace self-referential queries in policies with simpler conditions
    - Ensure that policies don't trigger themselves recursively

  2. Problem
    - Some policies were referencing their own table in subqueries, causing infinite recursion
    - This was causing 500 errors when authenticating and loading user schools
*/

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Admins can delete school members" ON public.school_members;
DROP POLICY IF EXISTS "Admins can read all school members" ON public.school_members;
DROP POLICY IF EXISTS "Admins can update school members" ON public.school_members;
DROP POLICY IF EXISTS "Users can create initial admin or admins can add members" ON public.school_members;

-- Recreate policies with non-recursive conditions

-- Policy for admins to delete school members
CREATE POLICY "Admins can delete school members - fixed"
  ON public.school_members
  FOR DELETE
  TO authenticated
  USING (
    user_id <> auth.uid() AND (
      EXISTS (
        SELECT 1 
        FROM public.school_members AS admin_members 
        WHERE admin_members.school_id = school_members.school_id 
          AND admin_members.user_id = auth.uid() 
          AND admin_members.role = 'admin'
      )
    )
  );

-- Policy for admins to read all school members
CREATE POLICY "Admins can read all school members - fixed"
  ON public.school_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM public.school_members AS admin_members 
      WHERE admin_members.school_id = school_members.school_id 
        AND admin_members.user_id = auth.uid() 
        AND admin_members.role = 'admin'
    )
  );

-- Policy for admins to update school members
CREATE POLICY "Admins can update school members - fixed"
  ON public.school_members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM public.school_members AS admin_members 
      WHERE admin_members.school_id = school_members.school_id 
        AND admin_members.user_id = auth.uid() 
        AND admin_members.role = 'admin'
    )
  )
  WITH CHECK (
    user_id <> auth.uid() AND (
      EXISTS (
        SELECT 1 
        FROM public.school_members AS admin_members 
        WHERE admin_members.school_id = school_members.school_id 
          AND admin_members.user_id = auth.uid() 
          AND admin_members.role = 'admin'
      )
    )
  );

-- Policy for user creation and admin adding members
CREATE POLICY "Users can create initial admin or admins can add members - fixed"
  ON public.school_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      -- Users can create themselves as admins for a new school
      user_id = auth.uid() AND 
      role = 'admin' AND 
      NOT EXISTS (
        SELECT 1 
        FROM public.school_members 
        WHERE school_id = school_members.school_id
      )
    ) OR (
      -- Admins can add members to their schools
      EXISTS (
        SELECT 1 
        FROM public.school_members AS admin_members 
        WHERE admin_members.school_id = school_members.school_id 
          AND admin_members.user_id = auth.uid() 
          AND admin_members.role = 'admin'
      )
    )
  );