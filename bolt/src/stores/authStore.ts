// src/stores/authStore.ts
// Fixed super admin check to use auth.users instead of users table
// Updated RPC function parameter from user_id_param to user_email
// Enhanced retry mechanism with improved detection of rate limit errors
// Fixed super admin direct access to properly bypass school selection
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User, UserRole, UserSchool } from '../types';

// Helper function for implementing retry with exponential backoff
const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 5, initialDelay = 1000) => {
  let retries = 0;
  let delay = initialDelay;
  
  while (retries < maxRetries) {
    try {
      return await fn();
    } catch (error: any) {
      // Improved detection of rate limit errors
      if (error.message?.includes('rate limit') || 
          error.message?.includes('over_request_rate_limit') ||
          error.status === 429 || 
          error.error?.status === 429 ||
          (error.body && typeof error.body === 'string' && error.body.includes('rate_limit'))) {
        retries++;
        
        console.warn(`Rate limit hit, retry attempt ${retries}/${maxRetries} after ${delay}ms delay`);
        
        // Stop if we've reached max retries
        if (retries >= maxRetries) {
          console.error('Max retries reached for rate-limited request');
          throw error;
        }
        
        // Wait for the delay period
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Exponential backoff: double the delay each time
        delay *= 2;
        
        // Continue to next iteration to retry
        continue;
      }
      
      // For other errors, throw immediately
      throw error;
    }
  }
};

interface AuthState {
  user: User | null;
  currentSchool: UserSchool | null;
  isLoadingUser: boolean;
  isLoadingSchools: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: any }>;
  signOut: () => Promise<void>;
  loadUserSchools: () => Promise<void>;
  setCurrentSchool: (school: UserSchool) => void;
  initialize: () => Promise<void>;
  isAdmin: (schoolId?: string) => boolean; 
  isSuperAdmin: () => boolean;
  refreshSession: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  currentSchool: null,
  isLoadingUser: true,
  isLoadingSchools: false,

  refreshSession: async () => {
    try {
      // Check if there's a session before trying to refresh it
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        console.warn('No session to refresh');
        return false;
      }
      
      // Use retry mechanism for session refresh to handle rate limiting
      const result = await retryWithBackoff(async () => {
        const { data, error } = await supabase.auth.refreshSession();
        if (error) {
          console.error('Session refresh error:', error);
          throw error;
        }
        return { success: true, data };
      });
      
      return !!result.data.session;
    } catch (err: any) {
      console.error('Failed to refresh session:', err);
      
      // If this is a rate limit error, add more context to the error
      if (err.message?.includes('rate limit') || err.status === 429) {
        console.warn('Rate limit reached during session refresh. Will try again later.');
      }
      
      return false;
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error('User not found');
      }

      // Just set basic user info without schools first
      const user: User = {
        id: data.user.id,
        email: data.user.email || '',
        displayName: data.user.user_metadata?.full_name,
        schools: [], // Empty array initially
        isSuperAdmin: data.user.app_metadata?.is_super_admin || false // Get super admin status
      };

      set({ user });
      
      // Load schools in the background
      get().loadUserSchools().catch(err => {
        console.warn('Failed to load schools in background:', err);
      });
      
      return { success: true };
    } catch (error: any) {
      console.error('Sign in error:', error);
      return { success: false, error: error };
    }
  },

  loadUserSchools: async () => {
    const { user } = get();
    if (!user) return;
    
    set({ isLoadingSchools: true });
    
    try {
      // Try to refresh the session first to prevent JWT expiration issues
      // Use the retry mechanism to handle rate limiting
      const sessionValid = await get().refreshSession();
      if (!sessionValid) {
        // If session refresh fails, don't immediately sign out - let the user try to continue
        // This prevents immediate sign-out on temporary network issues
        console.warn('Session refresh failed during loadUserSchools, continuing with existing session');
        // If we encounter auth errors later, we'll handle them appropriately
      }
      
      // Check if the user is a super admin - they can see all schools
      if (user.isSuperAdmin) {
        // Get all schools if user is super admin
        // Use retry mechanism for this query
        const schoolsResult = await retryWithBackoff(async () => {
          const { data, error } = await supabase
            .from('schools')
            .select('id, name')
            .order('name');
            
          if (error) {
            // Check for auth errors that indicate session problems
            if (error.message?.includes('JWT expired') || 
                error.message?.includes('invalid token') ||
                error.status === 401) {
              throw new Error('Session expired. Please sign in again.');
            }
            throw error;
          }
          
          return data || [];
        });
        
        const userSchools: UserSchool[] = schoolsResult.map(school => ({
          id: school.id,
          name: school.name,
          role: 'admin' // Super admins are treated as admins for all schools
        }));

        set(state => ({
          user: {
            ...state.user!,
            schools: userSchools
          },
          currentSchool: state.currentSchool || (userSchools.length > 0 ? userSchools[0] : null),
          isLoadingSchools: false
        }));
        
        return;
      }
      
      // For regular users:
      // Use a completely different approach to avoid the recursive policy issue
      
      // First, get the user's own ID
      const userId = user.id;
      
      // Method 1: Try the direct RPC function first (most reliable)
      try {
        const { data: userSchoolsDirect, error: directError } = await supabase.rpc('get_user_schools_direct', {
          user_id_param: userId
        });
        
        if (!directError && userSchoolsDirect) {
          // If direct call succeeds, use that data
          const userSchools: UserSchool[] = userSchoolsDirect.map((school: any) => ({
            id: school.school_id,
            name: school.school_name,
            role: school.role as UserRole
          }));
          
          set(state => ({
            user: {
              ...state.user!,
              schools: userSchools
            },
            currentSchool: state.currentSchool || (userSchools.length > 0 ? userSchools[0] : null),
            isLoadingSchools: false
          }));
          
          return;
        }
        
        // If direct function failed but not because it doesn't exist, throw the error
        if (directError && !directError.message?.includes('function "get_user_schools_direct" does not exist')) {
          throw directError;
        }
      } catch (err: any) {
        // Check for auth errors
        if (err.message?.includes('JWT expired') || 
            err.message?.includes('invalid token') ||
            err.status === 401) {
          throw new Error('Session expired. Please sign in again.');
        }
        
        // If direct approach fails, continue to fallback approach
        console.warn('Direct RPC approach failed, using fallback:', err);
      }
      
      // Method 2: Try the original RPC function as fallback
      try {
        const { data: userSchoolsRPC, error: rpcError } = await supabase.rpc('get_user_schools', {
          user_id_param: userId
        });
        
        if (!rpcError && userSchoolsRPC) {
          // If RPC call succeeds, use that data
          const userSchools: UserSchool[] = userSchoolsRPC.map((school: any) => ({
            id: school.school_id,
            name: school.school_name,
            role: school.role as UserRole
          }));
          
          set(state => ({
            user: {
              ...state.user!,
              schools: userSchools
            },
            currentSchool: state.currentSchool || (userSchools.length > 0 ? userSchools[0] : null),
            isLoadingSchools: false
          }));
          
          return;
        }
        
        // If RPC failed but not because it doesn't exist, throw the error
        if (rpcError && !rpcError.message?.includes('function "get_user_schools" does not exist')) {
          throw rpcError;
        }
        
        // Otherwise fall through to backup approach
      } catch (err: any) {
        // Check for auth errors
        if (err.message?.includes('JWT expired') || 
            err.message?.includes('invalid token') ||
            err.status === 401) {
          throw new Error('Session expired. Please sign in again.');
        }
        
        // If RPC approach fails, continue to fallback approach
        console.warn('RPC approach failed, using fallback:', err);
      }
      
      // Fallback approach: Use two separate queries with explicit data joining to avoid recursion
      
      // Use a more direct query approach with retry mechanism
      const membershipsResult = await retryWithBackoff(async () => {
        // Use a more direct query that includes the user_id in the actual path to avoid policy recursion
        const { data, error } = await supabase
          .from('school_members')
          .select('school_id, role')
          .eq('user_id', userId);
        
        if (error) {
          // Check for auth errors
          if (error.message?.includes('JWT expired') || 
              error.message?.includes('invalid token') ||
              error.status === 401) {
            throw new Error('Session expired. Please sign in again.');
          }
          throw error;
        }
        
        return data || [];
      });
      
      if (!membershipsResult || membershipsResult.length === 0) {
        // User has no schools
        set(state => ({
          user: {
            ...state.user!,
            schools: []
          },
          currentSchool: null,
          isLoadingSchools: false
        }));
        return;
      }
      
      // Then, get the school details separately
      const schoolIds = membershipsResult.map(m => m.school_id);
      
      // Use a separate query for schools
      const schoolsResult = await retryWithBackoff(async () => {
        const { data, error } = await supabase
          .from('schools')
          .select('id, name')
          .in('id', schoolIds)
          .order('name');
        
        if (error) {
          // Check for auth errors
          if (error.message?.includes('JWT expired') || 
              error.message?.includes('invalid token') ||
              error.status === 401) {
            throw new Error('Session expired. Please sign in again.');
          }
          throw error;
        }
        
        return data || [];
      });
      
      // Combine the data manually
      const userSchools: UserSchool[] = schoolsResult.map(school => {
        const membership = membershipsResult.find(m => m.school_id === school.id);
        return {
          id: school.id,
          name: school.name,
          role: membership?.role as UserRole
        };
      });

      set(state => ({
        user: {
          ...state.user!,
          schools: userSchools
        },
        currentSchool: state.currentSchool || (userSchools.length > 0 ? userSchools[0] : null),
        isLoadingSchools: false
      }));
    } catch (error: any) {
      console.error('Failed to load user schools:', error);
      
      // Handle JWT expiration specifically
      if (error.message?.includes('JWT expired') || 
          error.message?.includes('Session expired') ||
          error.message?.includes('invalid token') ||
          error.status === 401) {
        // Only sign out the user if there's a clear authentication issue
        console.warn('Authentication error detected, signing out user');
        await get().signOut();
        set({ user: null, currentSchool: null, isLoadingSchools: false });
      } else {
        // For rate limit errors, just mark loading as complete but don't sign out
        if (error.message?.includes('rate limit') || error.status === 429) {
          console.warn('Rate limit reached while loading schools. Will try again later.');
        }
        set({ isLoadingSchools: false });
      }
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error during sign out:', err);
    } finally {
      set({ user: null, currentSchool: null });
    }
  },

  setCurrentSchool: (school: UserSchool) => {
    set({ currentSchool: school });
  },

  initialize: async () => {
    set({ isLoadingUser: true });
    
    try {
      // Try to get the session with retry for rate limit issues
      const sessionResult = await retryWithBackoff(async () => {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        return data;
      });
      
      if (sessionResult.session?.user) {
        // Enhanced logging for super admin status
        const isSuperAdmin = sessionResult.session.user.app_metadata?.is_super_admin || false;
        if (isSuperAdmin) {
          console.log('User is a super admin, setting flag accordingly');
        }
        
        // Set minimal user info first
        const user: User = {
          id: sessionResult.session.user.id,
          email: sessionResult.session.user.email || '',
          displayName: sessionResult.session.user.user_metadata?.full_name,
          schools: [], // Empty initially
          isSuperAdmin: isSuperAdmin
        };
        
        set({ user, isLoadingUser: false });
        
        // Verify super admin status directly from the database for extra assurance
        try {
          const { data: superAdminCheck } = await supabase.rpc('check_user_super_admin', {
            user_email: sessionResult.session.user.email
          });
          
          if (superAdminCheck !== undefined && superAdminCheck !== user.isSuperAdmin) {
            console.log(`Super admin status updated from direct check: ${superAdminCheck}`);
            set(state => ({
              user: {
                ...state.user!,
                isSuperAdmin: superAdminCheck
              }
            }));
          }
        } catch (err) {
          // If this check fails, we'll still use the value from JWT - this is just an extra verification
          console.warn('Failed to verify super admin status directly:', err);
        }
        
        // Load schools in the background
        get().loadUserSchools().catch(error => {
          if (error.message?.includes('JWT expired') || 
              error.message?.includes('Session expired') ||
              error.message?.includes('invalid token') ||
              error.status === 401) {
            // If JWT expired during initialization, sign the user out
            get().signOut();
          } else {
            console.error('Error loading schools during initialization:', error);
          }
        });
      } else {
        set({ isLoadingUser: false });
      }
    } catch (error: any) {
      console.error('Error initializing auth:', error);
      
      // For rate limit errors, add specific logging
      if (error.message?.includes('rate limit') || error.status === 429) {
        console.warn('Rate limit reached during initialization. Continuing without user data.');
      }
      
      set({ isLoadingUser: false });
    }
  },

  // Check if user is an admin for a specific school or globally
  isAdmin: (schoolId?: string) => {
    const { user, currentSchool } = get();
    
    // Super admins have admin privileges everywhere
    if (user?.isSuperAdmin) return true;
    
    // If no schoolId is provided, use the current school
    const targetSchoolId = schoolId || currentSchool?.id;
    if (!targetSchoolId || !user) return false;
    
    // Check if the user is an admin for this specific school
    return user.schools.some(school => 
      school.id === targetSchoolId && school.role === 'admin'
    );
  },
  
  // Check if user is a super admin
  isSuperAdmin: () => {
    const { user } = get();
    return user?.isSuperAdmin === true;
  }
}));