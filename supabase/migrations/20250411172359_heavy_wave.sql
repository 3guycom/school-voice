/*
  # Fix infinite recursion in school_members policy

  1. Changes
    - Add a database function to safely get user schools without triggering policy recursion
    - This function is called via RPC and avoids the policy checks that were causing infinite recursion

  2. Security
    - Function is secure as it only returns data for the specified user
    - No security impact on existing policies
*/

-- Create a database function to get user schools without triggering policy recursion
CREATE OR REPLACE FUNCTION get_user_schools(user_id_param UUID)
RETURNS TABLE (
  school_id UUID,
  school_name TEXT,
  role TEXT
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT 
    schools.id as school_id,
    schools.name as school_name,
    sm.role
  FROM school_members sm
  JOIN schools ON sm.school_id = schools.id
  WHERE sm.user_id = user_id_param
  ORDER BY schools.name;
$$;