/*
  # Super Admin Feature Implementation
  
  1. New Features
    - Add is_super_admin field to auth.users table
    - Create super_admin_actions audit log table
    - Create RLS policies for super admin access
    - Create helper function to check super admin status
  
  2. Security
    - Enable super admins to access all schools and members
    - Maintain audit logs of all super admin actions
    - Add policies to control access across the system
*/

-- First check if is_super_admin column exists, if not add it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'is_super_admin'
  ) THEN
    ALTER TABLE auth.users ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Create audit log table for super admin actions
CREATE TABLE IF NOT EXISTS super_admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  affected_user_id UUID REFERENCES auth.users(id),
  affected_school_id UUID REFERENCES schools(id),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on admin_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_super_admin_actions_admin_id ON super_admin_actions(admin_id);

-- Create helper function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
DECLARE
  is_admin boolean;
BEGIN
  SELECT is_super_admin INTO is_admin
  FROM auth.users
  WHERE id = auth.uid();
  
  RETURN COALESCE(is_admin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policies for super admin access

-- Schools table - super admin policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'schools' AND policyname = 'Super admins can view all schools'
  ) THEN
    CREATE POLICY "Super admins can view all schools"
    ON public.schools
    FOR SELECT
    TO authenticated
    USING (public.is_super_admin());
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'schools' AND policyname = 'Super admins can manage all schools'
  ) THEN
    CREATE POLICY "Super admins can manage all schools"
    ON public.schools
    FOR ALL
    TO authenticated
    USING (public.is_super_admin());
  END IF;
END $$;

-- School members table - super admin policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'school_members' AND policyname = 'Super admins can view all school members'
  ) THEN
    CREATE POLICY "Super admins can view all school members"
    ON public.school_members
    FOR SELECT
    TO authenticated
    USING (public.is_super_admin());
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'school_members' AND policyname = 'Super admins can manage all school members'
  ) THEN
    CREATE POLICY "Super admins can manage all school members"
    ON public.school_members
    FOR ALL
    TO authenticated
    USING (public.is_super_admin());
  END IF;
END $$;

-- Tone profiles table - super admin policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'tone_profiles' AND policyname = 'Super admins can view all tone profiles'
  ) THEN
    CREATE POLICY "Super admins can view all tone profiles"
    ON public.tone_profiles
    FOR SELECT
    TO authenticated
    USING (public.is_super_admin());
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'tone_profiles' AND policyname = 'Super admins can manage all tone profiles'
  ) THEN
    CREATE POLICY "Super admins can manage all tone profiles"
    ON public.tone_profiles
    FOR ALL
    TO authenticated
    USING (public.is_super_admin());
  END IF;
END $$;

-- Content drafts table - super admin policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'content_drafts' AND policyname = 'Super admins can view all content drafts'
  ) THEN
    CREATE POLICY "Super admins can view all content drafts"
    ON public.content_drafts
    FOR SELECT
    TO authenticated
    USING (public.is_super_admin());
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'content_drafts' AND policyname = 'Super admins can manage all content drafts'
  ) THEN
    CREATE POLICY "Super admins can manage all content drafts"
    ON public.content_drafts
    FOR ALL
    TO authenticated
    USING (public.is_super_admin());
  END IF;
END $$;

-- Invitations table - super admin policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'invitations' AND policyname = 'Super admins can view all invitations'
  ) THEN
    CREATE POLICY "Super admins can view all invitations"
    ON public.invitations
    FOR SELECT
    TO authenticated
    USING (public.is_super_admin());
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'invitations' AND policyname = 'Super admins can manage all invitations'
  ) THEN
    CREATE POLICY "Super admins can manage all invitations"
    ON public.invitations
    FOR ALL
    TO authenticated
    USING (public.is_super_admin());
  END IF;
END $$;

-- Super admin actions table - RLS policies
ALTER TABLE super_admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view audit logs"
ON public.super_admin_actions
FOR SELECT
TO authenticated
USING (public.is_super_admin());

CREATE POLICY "Super admins can insert audit logs"
ON public.super_admin_actions
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  AND admin_id = auth.uid()
);

-- Create a function to set a user as super admin (for use with service role)
CREATE OR REPLACE FUNCTION public.set_super_admin(user_email TEXT, is_admin BOOLEAN DEFAULT TRUE)
RETURNS VOID AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Find the user by email
  SELECT id 
  INTO target_user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Update super admin status
  UPDATE auth.users
  SET is_super_admin = is_admin
  WHERE id = target_user_id;
  
  -- Log this action
  INSERT INTO super_admin_actions (
    admin_id, 
    action_type, 
    affected_user_id,
    details
  ) VALUES (
    auth.uid(),
    CASE WHEN is_admin THEN 'grant_super_admin' ELSE 'revoke_super_admin' END,
    target_user_id,
    jsonb_build_object('email', user_email)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;