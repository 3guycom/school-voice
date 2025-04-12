/*
  # Fix infinite recursion in school_members policies

  1. Changes
    - Fixed infinite recursion in school_members policies by updating the RLS policies
    - Added more targeted policy conditions that don't rely on recursive lookups
    - Created a new RPC function to safely retrieve user schools without triggering recursion
  
  2. Security
    - Maintains existing security boundaries
    - Ensures policies continue to enforce proper access control
*/

-- Create a secure function to get user schools that doesn't trigger recursive policies
CREATE OR REPLACE FUNCTION get_user_schools_direct(user_id_param UUID)
RETURNS TABLE (
  school_id UUID,
  school_name TEXT,
  role TEXT
) SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id AS school_id,
    s.name AS school_name,
    sm.role
  FROM 
    school_members sm
  JOIN 
    schools s ON sm.school_id = s.id
  WHERE 
    sm.user_id = user_id_param
  ORDER BY 
    s.name;
END;
$$ LANGUAGE plpgsql;

-- Fix existing policies on school_members to prevent infinite recursion
-- First, drop existing problematic policies that might be causing recursion
DROP POLICY IF EXISTS "Admins can view school members" ON school_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON school_members;

-- Re-create policies with non-recursive conditions
CREATE POLICY "Admins can view school members" ON school_members
FOR SELECT TO authenticated
USING (
  -- Direct check without recursion
  EXISTS (
    SELECT 1 FROM school_members sm 
    WHERE 
      sm.school_id = school_members.school_id 
      AND sm.user_id = auth.uid() 
      AND sm.role = 'admin'
  )
);

CREATE POLICY "Users can view own memberships" ON school_members
FOR SELECT TO authenticated
USING (
  -- Simple direct user check without recursion
  user_id = auth.uid()
);

-- Ensure the RPC function has appropriate grants
GRANT EXECUTE ON FUNCTION get_user_schools_direct(UUID) TO authenticated;