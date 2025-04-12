/**
 * Super admin store to manage users and schools across the entire system
 * Provides functionality for super administrators to manage the application
 */

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import { SuperAdminAction, SystemStats, User } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface SuperAdminState {
  users: User[];
  schools: any[];
  auditLogs: SuperAdminAction[];
  stats: SystemStats;
  loading: boolean;
  error: string | null;
  
  // User management
  fetchUsers: () => Promise<User[]>;
  toggleSuperAdmin: (userEmail: string, makeAdmin: boolean) => Promise<boolean>;
  
  // School management
  fetchSchools: () => Promise<any[]>;
  
  // Audit logs
  fetchAuditLogs: () => Promise<SuperAdminAction[]>;
  
  // Stats
  fetchSystemStats: () => Promise<SystemStats>;
}

// Utility function to check if user is a super admin
const isSuperAdmin = () => {
  const { user } = useAuthStore.getState();
  return user?.isSuperAdmin === true;
};

export const useSuperAdminStore = create<SuperAdminState>((set, get) => ({
  users: [],
  schools: [],
  auditLogs: [],
  stats: {
    users: 0,
    schools: 0,
    profiles: 0,
    drafts: 0
  },
  loading: false,
  error: null,
  
  fetchUsers: async () => {
    if (!isSuperAdmin()) {
      set({ error: 'Permission denied: Not a super admin' });
      return [];
    }
    
    set({ loading: true, error: null });
    
    try {
      // Get all users from the school_members table with their roles and schools
      const { data: membersData, error: membersError } = await supabase
        .from('school_members')
        .select(`
          id,
          user_id,
          role,
          school:school_id (
            id,
            name
          )
        `)
        .order('user_id');
        
      if (membersError) throw membersError;
      
      // Create a map to organize users by ID
      const userMap = new Map<string, User>();
      
      // Process member data to build user objects
      membersData?.forEach(member => {
        if (!userMap.has(member.user_id)) {
          userMap.set(member.user_id, {
            id: member.user_id,
            email: '',
            schools: []
          });
        }
        
        const user = userMap.get(member.user_id)!;
        user.schools.push({
          id: member.school.id,
          name: member.school.name,
          role: member.role
        });
      });
      
      // Get user details for each user
      const userIds = Array.from(userMap.keys());
      const users: User[] = [];
      
      for (const userId of userIds) {
        try {
          const { data: userData, error: userError } = await supabase.rpc(
            'get_user_by_id',
            { user_id: userId }
          );
          
          if (userError) throw userError;
          
          const user = userMap.get(userId);
          if (user && userData) {
            user.email = userData.email || '';
            user.displayName = userData.display_name || '';
            user.isSuperAdmin = userData.is_super_admin || false;
            users.push(user);
          }
        } catch (error) {
          console.warn(`Error fetching details for user ${userId}:`, error);
        }
      }
      
      set({ users, loading: false });
      return users;
    } catch (error) {
      console.error('Error fetching users:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch users',
        loading: false 
      });
      return [];
    }
  },
  
  toggleSuperAdmin: async (userEmail: string, makeAdmin: boolean) => {
    if (!isSuperAdmin()) {
      set({ error: 'Permission denied: Not a super admin' });
      return false;
    }
    
    set({ loading: true, error: null });
    
    try {
      // Use the set_super_admin RPC function to toggle admin status
      const { error } = await supabase.rpc(
        'set_super_admin', 
        { 
          user_email: userEmail,
          is_admin: makeAdmin
        }
      );
      
      if (error) throw error;
      
      // Update the local state
      set(state => ({
        users: state.users.map(user => 
          user.email === userEmail 
            ? { ...user, isSuperAdmin: makeAdmin }
            : user
        ),
        loading: false
      }));
      
      return true;
    } catch (error) {
      console.error('Error toggling super admin status:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update admin status',
        loading: false 
      });
      return false;
    }
  },
  
  fetchSchools: async () => {
    if (!isSuperAdmin()) {
      set({ error: 'Permission denied: Not a super admin' });
      return [];
    }
    
    set({ loading: true, error: null });
    
    try {
      const { data: schools, error } = await supabase
        .from('schools')
        .select('*')
        .order('name');
        
      if (error) throw error;
      
      set({ schools, loading: false });
      return schools || [];
    } catch (error) {
      console.error('Error fetching schools:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch schools',
        loading: false 
      });
      return [];
    }
  },
  
  fetchAuditLogs: async () => {
    if (!isSuperAdmin()) {
      set({ error: 'Permission denied: Not a super admin' });
      return [];
    }
    
    set({ loading: true, error: null });
    
    try {
      const { data: logs, error } = await supabase
        .from('super_admin_actions')
        .select(`
          id,
          admin_id,
          action_type,
          affected_user_id,
          affected_school_id,
          details,
          created_at
        `)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      const auditLogs = (logs || []).map(log => ({
        id: log.id,
        admin_id: log.admin_id,
        action_type: log.action_type,
        affected_user_id: log.affected_user_id,
        affected_school_id: log.affected_school_id,
        details: log.details,
        created_at: new Date(log.created_at)
      }));
      
      set({ auditLogs, loading: false });
      return auditLogs;
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch audit logs',
        loading: false 
      });
      return [];
    }
  },
  
  fetchSystemStats: async () => {
    if (!isSuperAdmin()) {
      set({ error: 'Permission denied: Not a super admin' });
      return get().stats;
    }
    
    set({ loading: true, error: null });
    
    try {
      // Get counts from different tables
      const [schoolsResult, usersResult, profilesResult, draftsResult] = await Promise.all([
        supabase.from('schools').select('id', { count: 'exact', head: true }),
        supabase.from('school_members').select('user_id', { count: 'exact', head: true }),
        supabase.from('tone_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('content_drafts').select('id', { count: 'exact', head: true })
      ]);
      
      const stats: SystemStats = {
        schools: schoolsResult.count || 0,
        users: usersResult.count || 0,
        profiles: profilesResult.count || 0,
        drafts: draftsResult.count || 0
      };
      
      set({ stats, loading: false });
      return stats;
    } catch (error) {
      console.error('Error fetching system stats:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch system stats',
        loading: false 
      });
      return get().stats;
    }
  }
}));