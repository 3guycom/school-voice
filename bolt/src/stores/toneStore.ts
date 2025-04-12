/**
 * Tone analysis store using Zustand
 * Updated to use stored procedure for fetching profiles
 */

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { analyzeTone } from '../lib/gemini';
import { extractTextFromFile } from '../lib/documentParser';
import { useAuthStore } from './authStore';
import type { ToneProfile, ToneDimension } from '../types';

interface ToneState {
  profiles: ToneProfile[];
  currentProfile: Omit<ToneProfile, 'id' | 'schoolId' | 'createdBy' | 'isActive' | 'createdAt' | 'updatedAt'> | null;
  loading: boolean;
  error: string | null;
  
  // Analysis functions
  analyzeWebsite: (url: string, onStatus?: (status: string) => void) => Promise<void>;
  analyzeDocument: (file: File, onStatus?: (status: string) => void) => Promise<void>;
  
  // Tone profile management
  saveProfile: (
    schoolId: string, 
    profile: { name: string, dimensions: ToneDimension[] }
  ) => Promise<string | null>;
  loadProfiles: (schoolId: string) => Promise<ToneProfile[]>;
  getProfile: (profileId: string) => Promise<ToneProfile | null>;
  updateProfile: (
    profileId: string, 
    updates: { name?: string, dimensions?: ToneDimension[], isActive?: boolean }
  ) => Promise<boolean>;
  deleteProfile: (profileId: string) => Promise<boolean>;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

const PROXY_SERVICES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest='
];

async function fetchWithRetry(url: string, maxRetries = 3): Promise<string> {
  let lastError: Error | null = null;
  
  for (const proxyService of PROXY_SERVICES) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const proxyUrl = `${proxyService}${encodeURIComponent(url)}`;
        console.log('Attempting to fetch from:', proxyUrl);
        
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const content = await response.text();
        if (!content || content.trim().length < 100) {
          throw new Error('Insufficient content retrieved');
        }
        
        return content;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Failed to fetch content');
        console.warn(`Attempt ${attempt + 1} failed for ${proxyService}:`, error);
        
        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
  }
  
  throw new Error(`Failed to fetch website content after trying multiple services. ${lastError?.message || ''}`);
}

export const useToneStore = create<ToneState>((set, get) => ({
  profiles: [],
  currentProfile: null,
  loading: false,
  error: null,

  analyzeDocument: async (file: File, onStatus?: (status: string) => void) => {
    set({ loading: true, error: null });
    try {
      // Validate file type
      if (!ALLOWED_FILE_TYPES.includes(file.type.toLowerCase())) {
        throw new Error('Unsupported file type. Please upload a PDF, DOC, DOCX, or TXT file.');
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('File is too large. Maximum size is 10MB.');
      }

      onStatus?.('Reading document...');
      const text = await extractTextFromFile(file);

      if (!text.trim()) {
        throw new Error('No readable content found in the document.');
      }

      onStatus?.('Analyzing tone...');
      const analysis = await analyzeTone(text);

      onStatus?.('Creating tone profile...');
      const profile = {
        name: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
        dimensions: Object.entries(analysis).map(([name, { score, explanation }]) => ({
          name,
          value: score,
          description: explanation,
        })),
      };

      set({ currentProfile: profile, loading: false, error: null });
      onStatus?.('Analysis complete!');
    } catch (error) {
      console.error('Document analysis error:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to analyze document',
        loading: false,
        currentProfile: null
      });
    }
  },

  analyzeWebsite: async (url: string, onStatus?: (status: string) => void) => {
    set({ loading: true, error: null });
    try {
      // Validate URL
      try {
        new URL(url);
      } catch {
        throw new Error('Please enter a valid website URL (e.g., https://example.com)');
      }

      onStatus?.('Setting up analysis...');
      
      try {
        onStatus?.('Fetching website content...');
        const html = await fetchWithRetry(url);
        
        onStatus?.('Processing content...');
        
        // Extract text content from HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Remove scripts, styles, and other non-content elements
        const elementsToRemove = tempDiv.querySelectorAll('script, style, meta, link, svg, nav, footer, header');
        elementsToRemove.forEach(el => el.remove());
        
        // Get text content and clean it up
        let text = tempDiv.textContent || '';
        text = text
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 5000); // Limit text length for analysis
        
        if (!text) {
          throw new Error('No readable content found on the webpage. Please try a different page.');
        }
        
        onStatus?.('Analyzing tone...');
        
        // Analyze tone using Gemini
        const analysis = await analyzeTone(text);
        
        onStatus?.('Creating tone profile...');
        
        const profile = {
          name: new URL(url).hostname,
          dimensions: Object.entries(analysis).map(([name, { score, explanation }]) => ({
            name,
            value: score,
            description: explanation,
          })),
        };

        set({ currentProfile: profile, loading: false, error: null });
        onStatus?.('Analysis complete!');
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('CORS')) {
            throw new Error('Unable to access the website due to security restrictions. Please try a different website.');
          } else if (error.message.includes('Failed to fetch')) {
            throw new Error('Unable to reach the website. Please check if the URL is correct and the website is accessible.');
          }
          throw error;
        }
        throw new Error('Failed to analyze website content');
      }
    } catch (error) {
      console.error('Website analysis error:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to analyze website',
        loading: false,
        currentProfile: null
      });
    }
  },

  saveProfile: async (schoolId: string, profile: { name: string; dimensions: ToneDimension[] }) => {
    set({ loading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('You must be signed in to save a tone profile');
      }

      // Check if user is an admin of this school
      const isAdmin = useAuthStore.getState().isAdmin(schoolId);
      if (!isAdmin) {
        throw new Error('Only school administrators can create tone profiles');
      }

      // Insert the profile
      const { data, error } = await supabase
        .from('tone_profiles')
        .insert({
          school_id: schoolId,
          name: profile.name,
          dimensions: profile.dimensions,
          created_by: user.id,
          is_active: true
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('Failed to save profile, no data returned');
      }

      // Refresh the profiles list
      await get().loadProfiles(schoolId);
      
      set({ loading: false, error: null });
      return data.id;
    } catch (error) {
      console.error('Save profile error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save profile';
      set({ error: errorMessage, loading: false });
      return null;
    }
  },

  loadProfiles: async (schoolId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .rpc('get_tone_profiles', { p_school_id: schoolId });

      if (error) {
        throw error;
      }

      const profiles = data.map(profile => ({
        id: profile.id,
        schoolId: profile.school_id,
        name: profile.name,
        dimensions: profile.dimensions as ToneDimension[],
        createdBy: profile.created_by,
        isActive: profile.is_active,
        createdAt: new Date(profile.created_at),
        updatedAt: new Date(profile.updated_at)
      }));

      set({ profiles, loading: false, error: null });
      return profiles;
    } catch (error) {
      console.error('Load profiles error:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load profiles',
        loading: false,
        profiles: [] // Clear profiles on error
      });
      return [];
    }
  },

  getProfile: async (profileId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('tone_profiles')
        .select()
        .eq('id', profileId)
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('Tone profile not found');
      }

      const profile: ToneProfile = {
        id: data.id,
        schoolId: data.school_id,
        name: data.name,
        dimensions: data.dimensions as ToneDimension[],
        createdBy: data.created_by,
        isActive: data.is_active,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      set({ loading: false, error: null });
      return profile;
    } catch (error) {
      console.error('Get profile error:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load tone profile',
        loading: false
      });
      return null;
    }
  },

  updateProfile: async (profileId: string, updates: { name?: string; dimensions?: ToneDimension[]; isActive?: boolean }) => {
    set({ loading: true, error: null });
    try {
      // First get the profile to check permissions
      const { data: profile, error: profileError } = await supabase
        .from('tone_profiles')
        .select('school_id')
        .eq('id', profileId)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (!profile) {
        throw new Error('Tone profile not found');
      }

      // Check if user is an admin of this school
      const isAdmin = useAuthStore.getState().isAdmin(profile.school_id);
      if (!isAdmin) {
        throw new Error('Only school administrators can update tone profiles');
      }

      // Update the profile
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.dimensions !== undefined) updateData.dimensions = updates.dimensions;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

      const { error } = await supabase
        .from('tone_profiles')
        .update(updateData)
        .eq('id', profileId);

      if (error) {
        throw error;
      }

      // Refresh the profiles list
      await get().loadProfiles(profile.school_id);
      
      set({ loading: false, error: null });
      return true;
    } catch (error) {
      console.error('Update profile error:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update tone profile',
        loading: false
      });
      return false;
    }
  },

  deleteProfile: async (profileId: string) => {
    set({ loading: true, error: null });
    try {
      // First get the profile to check permissions
      const { data: profile, error: profileError } = await supabase
        .from('tone_profiles')
        .select('school_id')
        .eq('id', profileId)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (!profile) {
        throw new Error('Tone profile not found');
      }

      // Check if user is an admin of this school
      const isAdmin = useAuthStore.getState().isAdmin(profile.school_id);
      if (!isAdmin) {
        throw new Error('Only school administrators can delete tone profiles');
      }

      // Check if the profile is used in any drafts
      const { count, error: countError } = await supabase
        .from('content_drafts')
        .select('id', { count: 'exact', head: true })
        .eq('tone_profile_id', profileId);

      if (countError) {
        throw countError;
      }

      if (count && count > 0) {
        throw new Error(`This tone profile is used in ${count} content drafts and cannot be deleted`);
      }

      // Delete the profile
      const { error } = await supabase
        .from('tone_profiles')
        .delete()
        .eq('id', profileId);

      if (error) {
        throw error;
      }

      // Update the profiles list
      const updatedProfiles = get().profiles.filter(p => p.id !== profileId);
      set({ profiles: updatedProfiles, loading: false, error: null });
      
      return true;
    } catch (error) {
      console.error('Delete profile error:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete tone profile',
        loading: false
      });
      return false;
    }
  },
}));