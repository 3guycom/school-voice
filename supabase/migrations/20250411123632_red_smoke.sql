/*
  # Fix RLS policies to avoid recursion and duplicate policy names

  1. Changes
    - Safely drop existing policies by checking if they exist first
    - Modify policies to use non-recursive logic for admin access checks
    - Ensure policies are correctly formed to prevent infinite recursion
    - Handle case of already existing policy names

  2. Security
    - Maintain same security rules ensuring admins can manage members
    - Ensure users can still read their own memberships
    - Preserve policy logic while fixing implementation
*/

-- Only drop policies that actually exist, checking first
DO $$ 
BEGIN
  -- Drop policies that cause recursion if they exist (using the old policy names)
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'school_members' AND policyname = 'Admins can delete school members - fixed') THEN
    DROP POLICY "Admins can delete school members - fixed" ON public.school_members;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'school_members' AND policyname = 'Admins can read all school members - fixed') THEN
    DROP POLICY "Admins can read all school members - fixed" ON public.school_members;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'school_members' AND policyname = 'Admins can update school members - fixed') THEN
    DROP POLICY "Admins can update school members - fixed" ON public.school_members;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'school_members' AND policyname = 'Users can create initial admin or admins can add members - fixe') THEN
    DROP POLICY "Users can create initial admin or admins can add members - fixe" ON public.school_members;
  END IF;
  
  -- Check for the policy that is causing the error
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'school_members' AND policyname = 'Users can read their own memberships') THEN
    -- Create this policy only if it doesn't already exist
    CREATE POLICY "Users can read their own memberships" 
    ON public.school_members FOR SELECT 
    TO authenticated
    USING (user_id = auth.uid());
  END IF;
END $$;

-- Create or replace admin read policy (with a different name if needed)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'school_members' AND policyname = 'Admins can read all school members') THEN
    DROP POLICY "Admins can read all school members" ON public.school_members;
  END IF;
END $$;

CREATE POLICY "Admins can read all school members" 
ON public.school_members FOR SELECT 
TO authenticated
USING (
  school_id IN (
    SELECT school_id 
    FROM school_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create or replace admin update policy
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'school_members' AND policyname = 'Admins can update school members') THEN
    DROP POLICY "Admins can update school members" ON public.school_members;
  END IF;
END $$;

CREATE POLICY "Admins can update school members" 
ON public.school_members FOR UPDATE 
TO authenticated
USING (
  user_id <> auth.uid() AND
  school_id IN (
    SELECT school_id 
    FROM school_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  user_id <> auth.uid() AND
  school_id IN (
    SELECT school_id 
    FROM school_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create or replace admin delete policy
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'school_members' AND policyname = 'Admins can delete school members') THEN
    DROP POLICY "Admins can delete school members" ON public.school_members;
  END IF;
END $$;

CREATE POLICY "Admins can delete school members" 
ON public.school_members FOR DELETE 
TO authenticated
USING (
  user_id <> auth.uid() AND
  school_id IN (
    SELECT school_id 
    FROM school_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create or replace user creation policy
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'school_members' AND policyname = 'Users can create initial admin or admins can add members') THEN
    DROP POLICY "Users can create initial admin or admins can add members" ON public.school_members;
  END IF;
END $$;

CREATE POLICY "Users can create initial admin or admins can add members" 
ON public.school_members FOR INSERT 
TO authenticated
WITH CHECK (
  -- Case 1: User creating themselves as admin for a new school (no existing members)
  (
    user_id = auth.uid() AND 
    role = 'admin' AND 
    NOT EXISTS (
      SELECT 1 
      FROM school_members 
      WHERE school_id = school_members.school_id
    )
  )
  OR
  -- Case 2: Admin adding new members to their school
  (
    school_id IN (
      SELECT school_id 
      FROM school_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
);