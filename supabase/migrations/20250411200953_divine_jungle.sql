-- Drop the existing function due to the return type error
DROP FUNCTION IF EXISTS public.get_admin_stats();

-- Function to get all schools for super admin without triggering policy recursion
CREATE OR REPLACE FUNCTION public.get_all_schools_for_admin()
RETURNS SETOF schools
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First check if the user is actually a super admin
  IF NOT (SELECT is_super_admin()) THEN
    RAISE EXCEPTION 'Permission denied: Super admin privileges required';
  END IF;

  -- If they are a super admin, return all schools directly
  RETURN QUERY
  SELECT * FROM public.schools
  ORDER BY name;
END;
$$;

-- Function to get schools using service role as a fallback
CREATE OR REPLACE FUNCTION public.get_schools_service_api()
RETURNS SETOF schools
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First check if the user is actually a super admin
  IF NOT (SELECT is_super_admin()) THEN
    RAISE EXCEPTION 'Permission denied: Super admin privileges required';
  END IF;

  -- Directly query the schools table, bypassing RLS
  RETURN QUERY
  SELECT * FROM public.schools
  ORDER BY name;
END;
$$;

-- Function to create a school for admin with proper boolean parameter
CREATE OR REPLACE FUNCTION public.create_school_for_admin(
  school_name text,
  school_website text,
  is_admin boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_school_id uuid;
BEGIN
  -- Check if user is super admin
  IF NOT (SELECT is_super_admin()) THEN
    RAISE EXCEPTION 'Only super admins can create schools this way';
  END IF;

  -- Insert new school
  INSERT INTO public.schools (name, website)
  VALUES (school_name, school_website)
  RETURNING id INTO new_school_id;

  RETURN new_school_id;
END;
$$;

-- Create the get_admin_stats function with a different name to avoid conflict
CREATE OR REPLACE FUNCTION public.get_admin_statistics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  school_count integer;
  user_count integer;
  profile_count integer;
  draft_count integer;
  result json;
BEGIN
  -- Verify user is super admin
  IF NOT (SELECT is_super_admin()) THEN
    RAISE EXCEPTION 'Permission denied: Super admin privileges required';
  END IF;

  -- Get counts
  SELECT COUNT(*) INTO school_count FROM public.schools;
  SELECT COUNT(DISTINCT user_id) INTO user_count FROM public.school_members;
  SELECT COUNT(*) INTO profile_count FROM public.tone_profiles;
  SELECT COUNT(*) INTO draft_count FROM public.content_drafts;

  -- Create JSON result
  result := json_build_object(
    'school_count', school_count,
    'user_count', user_count,
    'profile_count', profile_count,
    'draft_count', draft_count
  );

  RETURN result;
END;
$$;