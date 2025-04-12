/**
 * School management store using Zustand
 * Completely restructured around the new school-centric architecture
 * Handles school data, members, and invitations
 * Fixed to avoid recursion in queries
 */

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import type { School, SchoolMember, Invitation, UserRole } from '../types';

interface SchoolState {
  schools: School[];
  school: School | null;
  members: SchoolMember[];
  invitations: Invitation[];
  loading: {
    school: boolean;
    members: boolean;
    invitations: boolean;
  };
  error: string | null;
  successMessage: string | null;
  
  // School operations
  fetchSchool: (schoolId?: string) => Promise<School | null>;
  getSchoolById: (schoolId: string) => School | null;
  updateSchool: (updates: Partial<School>) => Promise<boolean>;
  createSchool: (name: string, website?: string | null) => Promise<{ schoolId: string } | null>;
  
  // Member operations
  fetchMembers: (schoolId: string) => Promise<SchoolMember[]>;
  updateMemberRole: (memberId: string, role: UserRole) => Promise<boolean>;
  removeMember: (memberId: string) => Promise<boolean>;
  
  // Invitation operations
  fetchInvitations: (schoolId: string) => Promise<Invitation[]>;
  createInvitation: (schoolId: string, email: string, role: UserRole) => Promise<boolean>;
  deleteInvitation: (invitationId: string) => Promise<boolean>;
  acceptInvitation: (token: string) => Promise<{ schoolId: string } | null>;
  
  // State management
  clearMessages: () => void;
}

export const useSchoolStore = create<SchoolState>((set, get) => ({
  schools: [],
  school: null,
  members: [],
  invitations: [],
  loading: {
    school: false,
    members: false,
    invitations: false,
  },
  error: null,
  successMessage: null,

  clearMessages: () => {
    set({ error: null, successMessage: null });
  },

  getSchoolById: (schoolId: string) => {
    // Try to find in the currently loaded schools first
    const { schools, school } = get();
    
    if (school && school.id === schoolId) {
      return school;
    }
    
    const foundSchool = schools.find(s => s.id === schoolId);
    if (foundSchool) {
      return foundSchool;
    }
    
    return null;
  },

  fetchSchool: async (schoolId?: string) => {
    const { currentSchool } = useAuthStore.getState();
    const targetSchoolId = schoolId || currentSchool?.id;
    
    if (!targetSchoolId) {
      set({ error: 'No school selected' });
      return null;
    }
    
    set({
      loading: { ...get().loading, school: true },
      error: null
    });

    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', targetSchoolId)
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('School not found');
      }

      const school: School = {
        id: data.id,
        name: data.name,
        website: data.website,
        members: [],
        toneProfiles: [],
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      set({
        school,
        loading: { ...get().loading, school: false },
        error: null
      });

      return school;
    } catch (error: any) {
      console.error('Fetch school error:', error);
      set({
        loading: { ...get().loading, school: false },
        error: `Failed to load school: ${error.message}`
      });
      return null;
    }
  },

  updateSchool: async (updates: Partial<School>) => {
    const { school } = get();
    const { currentSchool } = useAuthStore.getState();
    
    if (!school && !currentSchool) {
      set({ error: 'No school selected' });
      return false;
    }
    
    const schoolId = school?.id || currentSchool?.id;
    
    if (!schoolId) {
      set({ error: 'No school ID available' });
      return false;
    }

    set({
      loading: { ...get().loading, school: true },
      error: null,
      successMessage: null
    });

    try {
      const { error } = await supabase
        .from('schools')
        .update({
          name: updates.name,
          website: updates.website,
          updated_at: new Date().toISOString()
        })
        .eq('id', schoolId);

      if (error) {
        throw error;
      }

      // Refresh school data
      await get().fetchSchool(schoolId);

      set({
        loading: { ...get().loading, school: false },
        successMessage: 'School information updated successfully'
      });

      return true;
    } catch (error: any) {
      console.error('Update school error:', error);
      set({
        loading: { ...get().loading, school: false },
        error: `Failed to update school: ${error.message}`
      });
      return false;
    }
  },

  createSchool: async (name: string, website?: string | null) => {
    set({
      loading: { ...get().loading, school: true },
      error: null,
      successMessage: null
    });

    try {
      // Create the school record
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .insert([{
          name: name.trim(),
          website: website?.trim() || null
        }])
        .select()
        .single();

      if (schoolError) {
        throw schoolError;
      }

      if (!schoolData) {
        throw new Error('Failed to create school, no data returned');
      }

      // Get the current user
      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Add the user as an admin
      const { error: memberError } = await supabase
        .from('school_members')
        .insert([{
          school_id: schoolData.id,
          user_id: user.id,
          role: 'admin'
        }]);

      if (memberError) {
        // If adding member fails, clean up the school
        await supabase.from('schools').delete().eq('id', schoolData.id);
        throw memberError;
      }

      // Refresh the user's schools
      await useAuthStore.getState().loadUserSchools();

      set({
        loading: { ...get().loading, school: false },
        successMessage: 'School created successfully'
      });

      return { schoolId: schoolData.id };
    } catch (error: any) {
      console.error('Create school error:', error);
      set({
        loading: { ...get().loading, school: false },
        error: `Failed to create school: ${error.message}`
      });
      return null;
    }
  },

  fetchMembers: async (schoolId: string) => {
    set({
      loading: { ...get().loading, members: true },
      error: null
    });

    try {
      // First fetch member IDs
      const { data: memberData, error: memberError } = await supabase
        .from('school_members')
        .select('id, user_id, role, created_at')
        .eq('school_id', schoolId);

      if (memberError) {
        throw memberError;
      }

      // Then get user details for each member
      const members: SchoolMember[] = [];
      
      for (const member of memberData) {
        try {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('email, display_name')
            .eq('id', member.user_id)
            .single();
            
          if (!userError && userData) {
            members.push({
              id: member.id,
              userId: member.user_id,
              email: userData.email || 'Unknown',
              displayName: userData.display_name,
              role: member.role as UserRole,
              joinedAt: new Date(member.created_at)
            });
          } else {
            // Use limited info if user details can't be fetched
            members.push({
              id: member.id,
              userId: member.user_id,
              email: 'Unknown',
              role: member.role as UserRole,
              joinedAt: new Date(member.created_at)
            });
          }
        } catch (err) {
          console.warn(`Failed to get details for user ${member.user_id}:`, err);
        }
      }

      set({
        members,
        loading: { ...get().loading, members: false }
      });

      return members;
    } catch (error: any) {
      console.error('Fetch members error:', error);
      set({
        loading: { ...get().loading, members: false },
        error: `Failed to load school members: ${error.message}`
      });
      return [];
    }
  },

  updateMemberRole: async (memberId: string, role: UserRole) => {
    set({
      loading: { ...get().loading, members: true },
      error: null,
      successMessage: null
    });

    try {
      const { error } = await supabase
        .from('school_members')
        .update({ role })
        .eq('id', memberId);

      if (error) {
        throw error;
      }

      // Update local members list
      const updatedMembers = get().members.map(member => 
        member.id === memberId ? { ...member, role } : member
      );

      set({
        members: updatedMembers,
        loading: { ...get().loading, members: false },
        successMessage: 'Member role updated successfully'
      });

      return true;
    } catch (error: any) {
      console.error('Update member role error:', error);
      set({
        loading: { ...get().loading, members: false },
        error: `Failed to update member role: ${error.message}`
      });
      return false;
    }
  },

  removeMember: async (memberId: string) => {
    set({
      loading: { ...get().loading, members: true },
      error: null,
      successMessage: null
    });

    try {
      const { error } = await supabase
        .from('school_members')
        .delete()
        .eq('id', memberId);

      if (error) {
        throw error;
      }

      // Update local members list
      const updatedMembers = get().members.filter(member => member.id !== memberId);

      set({
        members: updatedMembers,
        loading: { ...get().loading, members: false },
        successMessage: 'Member removed successfully'
      });

      return true;
    } catch (error: any) {
      console.error('Remove member error:', error);
      set({
        loading: { ...get().loading, members: false },
        error: `Failed to remove member: ${error.message}`
      });
      return false;
    }
  },

  fetchInvitations: async (schoolId: string) => {
    set({
      loading: { ...get().loading, invitations: true },
      error: null
    });

    try {
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          id,
          school_id,
          email,
          role,
          token,
          expires_at,
          accepted_at,
          created_at,
          created_by
        `)
        .eq('school_id', schoolId)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString());

      if (error) {
        throw error;
      }
      
      // Now fetch school name separately to avoid recursion
      let schoolName = "Unknown School";
      try {
        const { data: schoolData } = await supabase
          .from('schools')
          .select('name')
          .eq('id', schoolId)
          .single();
          
        if (schoolData) {
          schoolName = schoolData.name;
        }
      } catch (err) {
        console.warn(`Failed to get name for school ${schoolId}:`, err);
      }

      const invitations: Invitation[] = data.map(item => ({
        id: item.id,
        schoolId: item.school_id,
        schoolName: schoolName,
        email: item.email,
        role: item.role as UserRole,
        token: item.token,
        expiresAt: new Date(item.expires_at),
        createdBy: item.created_by,
        createdAt: new Date(item.created_at)
      }));

      set({
        invitations,
        loading: { ...get().loading, invitations: false }
      });

      return invitations;
    } catch (error: any) {
      console.error('Fetch invitations error:', error);
      set({
        loading: { ...get().loading, invitations: false },
        error: `Failed to load invitations: ${error.message}`
      });
      return [];
    }
  },

  createInvitation: async (schoolId: string, email: string, role: UserRole) => {
    set({
      loading: { ...get().loading, invitations: true },
      error: null,
      successMessage: null
    });

    try {
      // Generate a random token
      const token = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
      
      // Set expiration to 7 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('invitations')
        .insert([{
          school_id: schoolId,
          email: email.toLowerCase().trim(),
          role,
          token,
          expires_at: expiresAt.toISOString(),
          created_by: user.id
        }]);

      if (error) {
        if (error.code === '23505') {
          throw new Error('An invitation has already been sent to this email');
        }
        throw error;
      }

      // Refresh invitations list
      await get().fetchInvitations(schoolId);

      set({
        loading: { ...get().loading, invitations: false },
        successMessage: `Invitation sent to ${email}`
      });

      return true;
    } catch (error: any) {
      console.error('Create invitation error:', error);
      set({
        loading: { ...get().loading, invitations: false },
        error: `Failed to send invitation: ${error.message}`
      });
      return false;
    }
  },

  deleteInvitation: async (invitationId: string) => {
    set({
      loading: { ...get().loading, invitations: true },
      error: null,
      successMessage: null
    });

    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId);

      if (error) {
        throw error;
      }

      // Update local invitations list
      const updatedInvitations = get().invitations.filter(inv => inv.id !== invitationId);

      set({
        invitations: updatedInvitations,
        loading: { ...get().loading, invitations: false },
        successMessage: 'Invitation deleted successfully'
      });

      return true;
    } catch (error: any) {
      console.error('Delete invitation error:', error);
      set({
        loading: { ...get().loading, invitations: false },
        error: `Failed to delete invitation: ${error.message}`
      });
      return false;
    }
  },

  acceptInvitation: async (token: string) => {
    set({
      loading: { 
        school: true,
        members: true,
        invitations: true 
      },
      error: null,
      successMessage: null
    });

    try {
      // First, find the invitation
      const { data: invitation, error: invitationError } = await supabase
        .from('invitations')
        .select('id, school_id, email, role, expires_at')
        .eq('token', token)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (invitationError) {
        throw new Error('Invalid or expired invitation');
      }

      if (!invitation) {
        throw new Error('Invitation not found');
      }

      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('You must be signed in to accept an invitation');
      }

      // Verify the invitation matches the current user's email
      if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
        throw new Error('This invitation was sent to a different email address');
      }

      // Add the user as a member of the school
      const { error: memberError } = await supabase
        .from('school_members')
        .insert([{
          school_id: invitation.school_id,
          user_id: user.id,
          role: invitation.role
        }]);

      if (memberError) {
        if (memberError.code === '23505') {
          throw new Error('You are already a member of this school');
        }
        throw memberError;
      }

      // Mark the invitation as accepted
      const { error: updateError } = await supabase
        .from('invitations')
        .update({
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      if (updateError) {
        throw updateError;
      }
      
      // Refresh user's schools
      await useAuthStore.getState().loadUserSchools();

      set({
        loading: {
          school: false,
          members: false,
          invitations: false
        },
        successMessage: 'You have successfully joined the school'
      });

      return { schoolId: invitation.school_id };
    } catch (error: any) {
      console.error('Accept invitation error:', error);
      set({
        loading: {
          school: false,
          members: false,
          invitations: false
        },
        error: `Failed to accept invitation: ${error.message}`
      });
      return null;
    }
  }
}));