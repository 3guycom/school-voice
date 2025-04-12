/*
  # Fix school_members policy recursion and access issues

  1. Changes
     - Update the 'Super admins can manage all school members' policy to use a direct super admin check
     - Update the 'Create school membership' policy to avoid recursion
     - Add a new function for checking super admin status more efficiently
  
  2. Security
     - Maintain all security while fixing recursion issue
     - Ensure super admins can properly manage all resources
*/

-- Create a more efficient function to check if a user is a super admin
CREATE OR REPLACE FUNCTION is_super_admin_cached()
RETURNS boolean AS $$
DECLARE
  _is_admin boolean;
BEGIN
  -- Check if we already determined the result in this transaction
  IF current_setting('app.is_super_admin', true) IS NOT NULL THEN
    RETURN current_setting('app.is_super_admin', true)::boolean;
  END IF;

  -- Get the value
  SELECT
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) INTO _is_admin;

  -- Cache the result for this transaction
  PERFORM set_config('app.is_super_admin', _is_admin::text, true);
  
  -- Return the result
  RETURN _is_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the policy for Super admins
DROP POLICY IF EXISTS "Super admins can manage all school members" ON school_members;
CREATE POLICY "Super admins can manage all school members" 
ON school_members 
FOR ALL 
TO authenticated 
USING (is_super_admin_cached());

-- Update the school creation policy to avoid recursion
DROP POLICY IF EXISTS "Create school membership" ON school_members;
CREATE POLICY "Create school membership" 
ON school_members 
FOR INSERT 
TO authenticated 
WITH CHECK (
  -- Is super admin (will use cached version)
  is_super_admin_cached()
  OR
  -- First admin for a new school
  ((user_id = auth.uid()) AND (role = 'admin') AND 
   (NOT EXISTS (
     SELECT 1 FROM school_members sm 
     WHERE sm.school_id = school_members.school_id
   )))
  OR
  -- Existing admin adding a new member
  (EXISTS (
     SELECT 1 FROM school_members admin_sm
     WHERE admin_sm.school_id = school_members.school_id
     AND admin_sm.user_id = auth.uid()
     AND admin_sm.role = 'admin'
  ))
);

-- Fix similar issues in other tables
DROP POLICY IF EXISTS "Super admins can view all schools" ON schools;
CREATE POLICY "Super admins can view all schools" 
ON schools 
FOR SELECT 
TO authenticated 
USING (is_super_admin_cached());

DROP POLICY IF EXISTS "Super admins can manage all schools" ON schools;
CREATE POLICY "Super admins can manage all schools" 
ON schools 
FOR ALL 
TO authenticated 
USING (is_super_admin_cached());

-- Update content_drafts policies
DROP POLICY IF EXISTS "Super admins can view all content drafts" ON content_drafts;
CREATE POLICY "Super admins can view all content drafts" 
ON content_drafts 
FOR SELECT 
TO authenticated 
USING (is_super_admin_cached());

DROP POLICY IF EXISTS "Super admins can manage all content drafts" ON content_drafts;
CREATE POLICY "Super admins can manage all content drafts" 
ON content_drafts 
FOR ALL 
TO authenticated 
USING (is_super_admin_cached());