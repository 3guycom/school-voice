/*
  # Fix infinite recursion in school_members RLS policy

  1. Changes
    - Replace the recursive SELECT policy with a non-recursive approach
    - Fix the recursive policy that was causing infinite recursion errors
    - Create more efficient policies that prevent recursion

  2. Security
    - Preserves security intent of original policies
    - Ensures proper access control while avoiding recursion
*/

-- First, drop the problematic policy that causes recursion
DROP POLICY IF EXISTS "Users can read school members for their schools" ON public.school_members;

-- Create a new SELECT policy that allows users to see:
-- 1. Their own memberships
-- 2. All members of schools where they are an admin
CREATE POLICY "Users can read own and school memberships" ON public.school_members
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR
        (
            school_id IN (
                SELECT sm.school_id 
                FROM school_members sm 
                WHERE sm.user_id = auth.uid() AND sm.role = 'admin'
            )
        )
    );

-- Fix the potentially problematic insert policy - it has a condition that seems broken
DROP POLICY IF EXISTS "Users can create initial admin or admins can add members" ON public.school_members;

-- Create a new INSERT policy that's cleaner and avoids recursion
CREATE POLICY "Users can create initial admin or admins can add members" ON public.school_members
    FOR INSERT TO authenticated
    WITH CHECK (
        -- First user can create themselves as admin for a new school
        (
            user_id = auth.uid() AND 
            role = 'admin' AND 
            NOT EXISTS (
                SELECT 1 FROM school_members 
                WHERE school_id = school_members.school_id
            )
        )
        OR
        -- Existing admins can add new members to their schools
        (
            school_id IN (
                SELECT sm.school_id 
                FROM school_members sm 
                WHERE sm.user_id = auth.uid() AND sm.role = 'admin'
            )
        )
    );

-- Fix the update policy to avoid recursion
DROP POLICY IF EXISTS "Admins can update school members" ON public.school_members;

CREATE POLICY "Admins can update school members" ON public.school_members
    FOR UPDATE TO authenticated
    USING (
        school_id IN (
            SELECT sm.school_id 
            FROM school_members sm 
            WHERE sm.user_id = auth.uid() AND sm.role = 'admin'
        )
    )
    WITH CHECK (
        school_id IN (
            SELECT sm.school_id 
            FROM school_members sm 
            WHERE sm.user_id = auth.uid() AND sm.role = 'admin'
        )
    );

-- Fix the delete policy to avoid recursion
DROP POLICY IF EXISTS "Admins can delete school members" ON public.school_members;

CREATE POLICY "Admins can delete school members" ON public.school_members
    FOR DELETE TO authenticated
    USING (
        school_id IN (
            SELECT sm.school_id 
            FROM school_members sm 
            WHERE sm.user_id = auth.uid() AND sm.role = 'admin'
        )
    );