// src/types/index.ts

export type UserRole = 'admin' | 'member' | 'readonly';

export interface UserSchool {
  id: string;
  name: string;
  role: UserRole;
}

export interface User {
  id: string;
  email: string;
  displayName?: string;
  schools: UserSchool[];
  isSuperAdmin?: boolean; // Added super admin flag
}

export interface School {
  id: string;
  name: string;
  website?: string | null;
  created_at?: string;
}

export interface SchoolMember {
  id: string;
  user_id: string;
  school_id: string;
  role: UserRole;
  email?: string;
  displayName?: string;
  created_at?: string;
}

export interface Invitation {
  id: string;
  school_id: string;
  email: string;
  role: UserRole;
  token: string;
  created_at: string;
  expires_at: string;
  school_name?: string;
}

export interface ToneDimension {
  name: string;
  value: number;
  description: string;
}

export interface ToneProfile {
  id: string;
  schoolId: string;
  name: string;
  dimensions: ToneDimension[];
  createdBy: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentDraft {
  id: string;
  schoolId: string;
  toneProfileId: string;
  userId: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SuperAdminAction {
  id: string;
  admin_id: string;
  action_type: string;
  affected_user_id?: string;
  affected_school_id?: string;
  details?: Record<string, any>;
  created_at: Date;
}

export interface SystemStats {
  schools: number;
  users: number;
  profiles: number;
  drafts: number;
}