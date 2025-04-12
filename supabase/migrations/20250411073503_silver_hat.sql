/*
  # Complete architecture overhaul
  
  1. New Structure
    - Schools as the central entity
    - Clear role-based access control
    - Invitation system for new users
    - Clean separation between admins and regular users
  
  2. Security
    - School-centric RLS policies
    - Role-based permissions
    - Secure invitation flow
*/

-- First drop all existing tables to start fresh
DROP TABLE IF EXISTS content_drafts CASCADE;
DROP TABLE IF EXISTS tone_profiles CASCADE;
DROP TABLE IF EXISTS invitations CASCADE;
DROP TABLE IF EXISTS school_members CASCADE;
DROP TABLE IF EXISTS schools CASCADE;

-- Create schools table (central entity)
CREATE TABLE schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  website text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create school_members junction table (connects users to schools with roles)
CREATE TABLE school_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'member')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(school_id, user_id)
);

-- Create invitations table (for inviting new users)
CREATE TABLE invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('admin', 'member')),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(school_id, email)
);

-- Create tone_profiles table (owned by schools)
CREATE TABLE tone_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  dimensions jsonb NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create content_drafts table (created by users using tone profiles)
CREATE TABLE content_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  tone_profile_id uuid NOT NULL REFERENCES tone_profiles(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- INDEXES
CREATE INDEX idx_school_members_school_id ON school_members(school_id);
CREATE INDEX idx_school_members_user_id ON school_members(user_id);
CREATE INDEX idx_invitations_school_id ON invitations(school_id);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_tone_profiles_school_id ON tone_profiles(school_id);
CREATE INDEX idx_content_drafts_school_id ON content_drafts(school_id);
CREATE INDEX idx_content_drafts_user_id ON content_drafts(user_id);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tone_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_drafts ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR SCHOOLS
-- Only allow admin creation of schools
CREATE POLICY "Admin can create schools"
  ON schools
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can read schools they are members of
CREATE POLICY "Users can read schools they belong to"
  ON schools
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM school_members
      WHERE school_members.school_id = schools.id
      AND school_members.user_id = auth.uid()
    )
  );

-- Only school admins can update school details
CREATE POLICY "Admins can update schools"
  ON schools
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM school_members
      WHERE school_members.school_id = schools.id
      AND school_members.user_id = auth.uid()
      AND school_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM school_members
      WHERE school_members.school_id = schools.id
      AND school_members.user_id = auth.uid()
      AND school_members.role = 'admin'
    )
  );

-- POLICIES FOR SCHOOL_MEMBERS
-- Users can read school members for schools they belong to
CREATE POLICY "Users can read school members for their schools"
  ON school_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM school_members AS sm
      WHERE sm.school_id = school_members.school_id
      AND sm.user_id = auth.uid()
    )
  );

-- Only admins can add/update/delete members
CREATE POLICY "Admins can manage school members"
  ON school_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM school_members AS sm
      WHERE sm.school_id = school_members.school_id
      AND sm.user_id = auth.uid()
      AND sm.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM school_members AS sm
      WHERE sm.school_id = school_members.school_id
      AND sm.user_id = auth.uid()
      AND sm.role = 'admin'
    )
  );

-- POLICIES FOR INVITATIONS
-- Admins can create and manage invitations
CREATE POLICY "Admins can manage invitations"
  ON invitations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM school_members
      WHERE school_members.school_id = invitations.school_id
      AND school_members.user_id = auth.uid()
      AND school_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM school_members
      WHERE school_members.school_id = invitations.school_id
      AND school_members.user_id = auth.uid()
      AND school_members.role = 'admin'
    )
  );

-- Users can read their own invitations
CREATE POLICY "Users can read their own invitations"
  ON invitations
  FOR SELECT
  TO authenticated
  USING (invitations.email = auth.jwt() ->> 'email');

-- POLICIES FOR TONE PROFILES
-- School members can read tone profiles
CREATE POLICY "Members can read tone profiles"
  ON tone_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM school_members
      WHERE school_members.school_id = tone_profiles.school_id
      AND school_members.user_id = auth.uid()
    )
  );

-- Only admins can create and manage tone profiles
CREATE POLICY "Admins can manage tone profiles"
  ON tone_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM school_members
      WHERE school_members.school_id = tone_profiles.school_id
      AND school_members.user_id = auth.uid()
      AND school_members.role = 'admin'
    )
  );

CREATE POLICY "Admins can update tone profiles"
  ON tone_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM school_members
      WHERE school_members.school_id = tone_profiles.school_id
      AND school_members.user_id = auth.uid()
      AND school_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM school_members
      WHERE school_members.school_id = tone_profiles.school_id
      AND school_members.user_id = auth.uid()
      AND school_members.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete tone profiles"
  ON tone_profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM school_members
      WHERE school_members.school_id = tone_profiles.school_id
      AND school_members.user_id = auth.uid()
      AND school_members.role = 'admin'
    )
  );

-- POLICIES FOR CONTENT DRAFTS
-- Users can read content drafts from their school
CREATE POLICY "Users can read content drafts from their school"
  ON content_drafts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM school_members
      WHERE school_members.school_id = content_drafts.school_id
      AND school_members.user_id = auth.uid()
    )
  );

-- Users can create, update, and delete their own content drafts
CREATE POLICY "Users can manage their own content drafts"
  ON content_drafts
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM school_members
      WHERE school_members.school_id = content_drafts.school_id
      AND school_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM school_members
      WHERE school_members.school_id = content_drafts.school_id
      AND school_members.user_id = auth.uid()
    )
  );