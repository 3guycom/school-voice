/*
  # Add additional helper functions for school access
  
  1. New Functions
    - Updated get_user_schools_direct function to be more resilient
    - Add is_first_admin function to check if a user is creating the first admin record
    - Fix user invited to school function to handle invitation acceptance
  
  2. Security
    - Maintain same security model with SECURITY DEFINER
    - Ensure proper user isolation between schools
*/

-- Drop functions if they exist to allow recreation
DROP FUNCTION IF EXISTS public.get_user_schools_direct(uuid);
DROP FUNCTION IF EXISTS public.is_first_admin(uuid);

-- Create a more resilient function to get user schools
CREATE OR REPLACE FUNCTION public.get_user_schools_direct(user_id_param UUID)
RETURNS TABLE (
  school_id UUID,
  school_name TEXT,
  role TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Get schools directly from database
  RETURN QUERY
  SELECT 
    s.id as school_id,
    s.name as school_name,
    sm.role
  FROM public.school_members sm
  JOIN public.schools s ON sm.school_id = s.id
  WHERE sm.user_id = user_id_param
  ORDER BY s.name;
  
  -- If no results, check for super admin status and return all schools
  IF NOT FOUND THEN
    -- Check if user is a super admin
    IF EXISTS (
      SELECT 1 FROM auth.users WHERE id = user_id_param AND is_super_admin = true
    ) THEN
      -- Return all schools with admin role for super admins
      RETURN QUERY
      SELECT 
        s.id as school_id,
        s.name as school_name,
        'admin'::text as role
      FROM public.schools s
      ORDER BY s.name;
    END IF;
  END IF;
END;
$$;

-- Create function to check if a user is creating the first admin record
CREATE OR REPLACE FUNCTION public.is_first_admin(school_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 
    FROM public.school_members 
    WHERE school_id = school_id_param
  );
END;
$$;

-- Create function to detect if a user is part of a pending invitation
CREATE OR REPLACE FUNCTION public.has_pending_invitation(user_email TEXT, school_id_param UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF school_id_param IS NULL THEN
    -- Check for any pending invitation
    RETURN EXISTS (
      SELECT 1
      FROM public.invitations
      WHERE 
        email = user_email AND
        accepted_at IS NULL AND
        expires_at > NOW()
    );
  ELSE
    -- Check for pending invitation to specific school
    RETURN EXISTS (
      SELECT 1
      FROM public.invitations
      WHERE 
        email = user_email AND
        school_id = school_id_param AND
        accepted_at IS NULL AND
        expires_at > NOW()
    );
  END IF;
END;
$$;