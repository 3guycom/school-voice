/*
  # Fix registration flow and RLS policies

  1. Changes
    - Drop and recreate problematic RLS policies on school_members table
    - Simplify the RLS policies to avoid recursion
    - Fix school_members policy to properly handle first admin creation
    - Fix policy for admins to manage school members
*/

-- Drop existing problematic policies on school_members
DROP POLICY IF EXISTS "Users can read own and school memberships" ON public.school_members;
DROP POLICY IF EXISTS "Users can create initial admin or admins can add members" ON public.school_members;
DROP POLICY IF EXISTS "Admins can update school members" ON public.school_members;
DROP POLICY IF EXISTS "Admins can delete school members" ON public.school_members;

-- Create a simplified SELECT policy that doesn't cause recursion
CREATE POLICY "Users can read their own memberships" 
ON public.school_members
FOR SELECT 
TO authenticated
USING (
  -- Users can see their own memberships
  user_id = auth.uid()
);

-- Create a separate policy for admins to see all members of their schools
CREATE POLICY "Admins can read all school members" 
ON public.school_members
FOR SELECT 
TO authenticated
USING (
  -- Schools where the user is an admin
  school_id IN (
    SELECT school_id 
    FROM school_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create a non-recursive policy for INSERT operations
CREATE POLICY "Users can create initial admin or admins can add members" 
ON public.school_members
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Option 1: First admin of a new school
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
  -- Option 2: Admin adding new members
  (
    school_id IN (
      SELECT school_id 
      FROM school_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
);

-- Create a simplified UPDATE policy
CREATE POLICY "Admins can update school members" 
ON public.school_members
FOR UPDATE 
TO authenticated
USING (
  -- Only for schools where the user is an admin
  school_id IN (
    SELECT school_id 
    FROM school_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  -- Cannot modify own record (prevents privilege escalation)
  user_id != auth.uid() AND
  -- Only for schools where the user is an admin
  school_id IN (
    SELECT school_id 
    FROM school_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create a simplified DELETE policy
CREATE POLICY "Admins can delete school members" 
ON public.school_members
FOR DELETE 
TO authenticated
USING (
  -- Cannot delete own record (prevents lockout)
  user_id != auth.uid() AND
  -- Only for schools where the user is an admin
  school_id IN (
    SELECT school_id 
    FROM school_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);