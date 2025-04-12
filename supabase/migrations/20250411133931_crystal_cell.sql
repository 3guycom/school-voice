/*
  # Fix school_members table and policies
  
  1. Changes
    - Create school_members table if it doesn't exist
    - Create helper functions for admin checks
    - Create unique policies with timestamps to avoid conflicts
  
  2. Security
    - Maintain proper RLS security for school members
    - Use helper functions to simplify policy logic
    - Avoid recursive policy checks
*/

-- First ensure school_members table exists before creating policies
CREATE TABLE IF NOT EXISTS public.school_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'member')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(school_id, user_id)
);

-- Create indexes to improve performance
CREATE INDEX IF NOT EXISTS idx_school_members_school_id ON public.school_members(school_id);
CREATE INDEX IF NOT EXISTS idx_school_members_user_id ON public.school_members(user_id);

-- Enable RLS
ALTER TABLE public.school_members ENABLE ROW LEVEL SECURITY;

-- Create helper functions for admin checks and school membership checks
-- Using OR REPLACE to make this idempotent
CREATE OR REPLACE FUNCTION public.is_school_admin(school_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.school_members
    WHERE user_id = auth.uid()
    AND school_id = $1
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.school_has_members(school_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.school_members 
    WHERE school_id = $1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Use DO block to safely drop and recreate policies
DO $$ 
DECLARE
    policies_to_drop text[] := ARRAY[
        'Users can view own memberships',
        'Admins can view school members',
        'Allow initial admin creation',
        'Admins can add members',
        'Admins can update school members',
        'Admins can delete school members',
        'Users can read their own memberships',
        'Users can read school members for their schools',
        'Admins can read all school members',
        'Users can create initial admin or admins can add members',
        'Create school membership',
        'Delete school membership',
        'Update school membership'
    ];
    policy_name text;
BEGIN
    -- Drop existing policies that we plan to recreate
    FOREACH policy_name IN ARRAY policies_to_drop
    LOOP
        IF EXISTS (
            SELECT FROM pg_policies 
            WHERE tablename = 'school_members' 
            AND schemaname = 'public'
            AND policyname = policy_name
        ) THEN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.school_members', policy_name);
        END IF;
    END LOOP;

    -- Create policies only if they don't already exist
    
    -- 1. Simple policy for users to read their own memberships
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'school_members' 
        AND schemaname = 'public'
        AND policyname = 'Users can view own memberships_131624'
    ) THEN
        CREATE POLICY "Users can view own memberships_131624"
        ON public.school_members
        FOR SELECT
        TO authenticated
        USING (user_id = auth.uid());
    END IF;

    -- 2. Simple policy for school creation (first member is admin)
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'school_members' 
        AND schemaname = 'public'
        AND policyname = 'Allow initial admin creation_131624'
    ) THEN
        CREATE POLICY "Allow initial admin creation_131624"
        ON public.school_members
        FOR INSERT
        TO authenticated
        WITH CHECK (
            -- For new schools without members
            NOT public.school_has_members(school_id)
        );
    END IF;

    -- 3. Policy for admins to add new members
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'school_members' 
        AND schemaname = 'public'
        AND policyname = 'Admins can add members_131624'
    ) THEN
        CREATE POLICY "Admins can add members_131624"
        ON public.school_members
        FOR INSERT
        TO authenticated
        WITH CHECK (
            public.is_school_admin(school_id)
        );
    END IF;

    -- 4. Policy for admins to view school members
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'school_members' 
        AND schemaname = 'public'
        AND policyname = 'Admins can view school members_131624'
    ) THEN
        CREATE POLICY "Admins can view school members_131624"
        ON public.school_members
        FOR SELECT
        TO authenticated
        USING (public.is_school_admin(school_id));
    END IF;

    -- 5. Policy for admins to update school members
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'school_members' 
        AND schemaname = 'public'
        AND policyname = 'Admins can update school members_131624'
    ) THEN
        CREATE POLICY "Admins can update school members_131624"
        ON public.school_members
        FOR UPDATE
        TO authenticated
        USING (public.is_school_admin(school_id));
    END IF;

    -- 6. Policy for admins to delete school members
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'school_members' 
        AND schemaname = 'public'
        AND policyname = 'Admins can delete school members_131624'
    ) THEN
        CREATE POLICY "Admins can delete school members_131624"
        ON public.school_members
        FOR DELETE
        TO authenticated
        USING (public.is_school_admin(school_id));
    END IF;
END $$;