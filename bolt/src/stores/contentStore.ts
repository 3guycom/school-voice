/**
 * Content management store using Zustand
 * Restructured to match the new school-centric architecture
 * Manages content drafts and their relationship to tone profiles
 */

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import type { ContentDraft } from '../types';

interface ContentState {
  drafts: ContentDraft[];
  currentDraft: ContentDraft | null;
  loading: boolean;
  error: string | null;
  successMessage: string | null;
  
  // Draft operations
  loadDrafts: (schoolId: string) => Promise<ContentDraft[]>;
  getDraft: (draftId: string) => Promise<ContentDraft | null>;
  saveDraft: (draft: {
    schoolId: string;
    toneProfileId: string;
    title: string;
    content: string;
  }) => Promise<string | null>;
  updateDraft: (draftId: string, updates: {
    title?: string;
    content?: string;
    toneProfileId?: string;
  }) => Promise<boolean>;
  deleteDraft: (draftId: string) => Promise<boolean>;
  
  // Utility functions
  clearMessages: () => void;
  setCurrentDraft: (draft: ContentDraft | null) => void;
}

export const useContentStore = create<ContentState>((set, get) => ({
  drafts: [],
  currentDraft: null,
  loading: false,
  error: null,
  successMessage: null,

  loadDrafts: async (schoolId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('content_drafts')
        .select(`
          id,
          school_id,
          tone_profile_id,
          user_id,
          title,
          content,
          created_at,
          updated_at,
          tone_profiles(name)
        `)
        .eq('school_id', schoolId)
        .order('updated_at', { ascending: false });

      if (error) {
        throw error;
      }

      const drafts: ContentDraft[] = data.map(draft => ({
        id: draft.id,
        schoolId: draft.school_id,
        toneProfileId: draft.tone_profile_id,
        userId: draft.user_id,
        title: draft.title,
        content: draft.content,
        createdAt: new Date(draft.created_at),
        updatedAt: new Date(draft.updated_at)
      }));

      set({ drafts, loading: false, error: null });
      return drafts;
    } catch (error) {
      console.error('Load drafts error:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load content drafts',
        loading: false
      });
      return [];
    }
  },

  getDraft: async (draftId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('content_drafts')
        .select(`
          id,
          school_id,
          tone_profile_id,
          user_id,
          title,
          content,
          created_at,
          updated_at,
          tone_profiles(name)
        `)
        .eq('id', draftId)
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('Content draft not found');
      }

      const draft: ContentDraft = {
        id: data.id,
        schoolId: data.school_id,
        toneProfileId: data.tone_profile_id,
        userId: data.user_id,
        title: data.title,
        content: data.content,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      set({ currentDraft: draft, loading: false, error: null });
      return draft;
    } catch (error) {
      console.error('Get draft error:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load content draft',
        loading: false
      });
      return null;
    }
  },

  saveDraft: async (draft: {
    schoolId: string;
    toneProfileId: string;
    title: string;
    content: string;
  }) => {
    set({ loading: true, error: null, successMessage: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('You must be signed in to save content');
      }

      // Validate the title and content
      if (!draft.title.trim()) {
        throw new Error('Title is required');
      }

      if (!draft.content.trim()) {
        throw new Error('Content cannot be empty');
      }

      // Create the draft
      const { data, error } = await supabase
        .from('content_drafts')
        .insert({
          school_id: draft.schoolId,
          tone_profile_id: draft.toneProfileId,
          user_id: user.id,
          title: draft.title.trim(),
          content: draft.content.trim()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('Failed to save content draft, no data returned');
      }

      // Update the drafts list
      const newDraft: ContentDraft = {
        id: data.id,
        schoolId: data.school_id,
        toneProfileId: data.tone_profile_id,
        userId: data.user_id,
        title: data.title,
        content: data.content,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      set({ 
        drafts: [newDraft, ...get().drafts],
        currentDraft: newDraft,
        loading: false,
        successMessage: 'Content draft saved successfully'
      });

      return data.id;
    } catch (error) {
      console.error('Save draft error:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to save content draft',
        loading: false
      });
      return null;
    }
  },

  updateDraft: async (draftId: string, updates: {
    title?: string;
    content?: string;
    toneProfileId?: string;
  }) => {
    set({ loading: true, error: null, successMessage: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('You must be signed in to update content');
      }

      // First check if this draft belongs to the user
      const { data: existingDraft, error: checkError } = await supabase
        .from('content_drafts')
        .select('user_id, school_id')
        .eq('id', draftId)
        .single();

      if (checkError) {
        throw checkError;
      }

      if (!existingDraft) {
        throw new Error('Content draft not found');
      }

      if (existingDraft.user_id !== user.id) {
        throw new Error('You can only edit your own content drafts');
      }

      // Prepare the update data
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.title !== undefined) {
        if (!updates.title.trim()) {
          throw new Error('Title is required');
        }
        updateData.title = updates.title.trim();
      }

      if (updates.content !== undefined) {
        if (!updates.content.trim()) {
          throw new Error('Content cannot be empty');
        }
        updateData.content = updates.content.trim();
      }

      if (updates.toneProfileId !== undefined) {
        updateData.tone_profile_id = updates.toneProfileId;
      }

      // Update the draft
      const { error } = await supabase
        .from('content_drafts')
        .update(updateData)
        .eq('id', draftId);

      if (error) {
        throw error;
      }

      // Refresh the draft
      await get().getDraft(draftId);
      
      // Also refresh the drafts list
      await get().loadDrafts(existingDraft.school_id);

      set({ loading: false, successMessage: 'Content draft updated successfully' });
      return true;
    } catch (error) {
      console.error('Update draft error:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update content draft',
        loading: false
      });
      return false;
    }
  },

  deleteDraft: async (draftId: string) => {
    set({ loading: true, error: null, successMessage: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('You must be signed in to delete content');
      }

      // First check if this draft belongs to the user
      const { data: existingDraft, error: checkError } = await supabase
        .from('content_drafts')
        .select('user_id')
        .eq('id', draftId)
        .single();

      if (checkError) {
        throw checkError;
      }

      if (!existingDraft) {
        throw new Error('Content draft not found');
      }

      if (existingDraft.user_id !== user.id) {
        throw new Error('You can only delete your own content drafts');
      }

      // Delete the draft
      const { error } = await supabase
        .from('content_drafts')
        .delete()
        .eq('id', draftId);

      if (error) {
        throw error;
      }

      // Update the drafts list
      const updatedDrafts = get().drafts.filter(draft => draft.id !== draftId);
      
      // Clear current draft if it's the one being deleted
      if (get().currentDraft?.id === draftId) {
        set({ currentDraft: null });
      }

      set({ 
        drafts: updatedDrafts,
        loading: false,
        successMessage: 'Content draft deleted successfully'
      });

      return true;
    } catch (error) {
      console.error('Delete draft error:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete content draft',
        loading: false
      });
      return false;
    }
  },

  clearMessages: () => {
    set({ error: null, successMessage: null });
  },

  setCurrentDraft: (draft: ContentDraft | null) => {
    set({ currentDraft: draft });
  }
}));