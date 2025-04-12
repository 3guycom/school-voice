/**
 * ContentEditor page
 * Allows users to edit content drafts with tone profile integration
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useSchoolStore } from '../stores/schoolStore';
import { AlertCircle, Save, ArrowLeft } from 'lucide-react';

const ContentEditor: React.FC = () => {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const supabase = useSupabaseClient();
  const { currentSchool } = useSchoolStore();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [toneProfileId, setToneProfileId] = useState<string | null>(null);
  const [toneProfiles, setToneProfiles] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDraft = async () => {
      if (!draftId || !currentSchool) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch the content draft
        const { data: draft, error: draftError } = await supabase
          .from('content_drafts')
          .select('*')
          .eq('id', draftId)
          .eq('school_id', currentSchool.id)
          .single();
        
        if (draftError) throw draftError;
        
        if (draft) {
          setTitle(draft.title);
          setContent(draft.content);
          setToneProfileId(draft.tone_profile_id);
        }
        
        // Fetch available tone profiles for the school
        const { data: profiles, error: profilesError } = await supabase
          .from('tone_profiles')
          .select('id, name')
          .eq('school_id', currentSchool.id)
          .eq('is_active', true);
        
        if (profilesError) throw profilesError;
        
        setToneProfiles(profiles || []);
      } catch (err) {
        console.error('Error fetching draft:', err);
        setError('Failed to load content draft. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDraft();
  }, [draftId, currentSchool, supabase]);

  const handleSave = async () => {
    if (!draftId || !currentSchool) return;
    
    setSaving(true);
    setError(null);
    
    try {
      const { error } = await supabase
        .from('content_drafts')
        .update({
          title,
          content,
          tone_profile_id: toneProfileId,
          updated_at: new Date().toISOString()
        })
        .eq('id', draftId)
        .eq('school_id', currentSchool.id);
      
      if (error) throw error;
      
    } catch (err) {
      console.error('Error saving draft:', err);
      setError('Failed to save content draft. Please try again later.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </button>
        
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save
        </button>
      </div>
      
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start">
          <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      <div className="mb-6">
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Enter title"
        />
      </div>
      
      <div className="mb-6">
        <label htmlFor="toneProfile" className="block text-sm font-medium text-gray-700 mb-1">
          Tone Profile
        </label>
        <select
          id="toneProfile"
          value={toneProfileId || ''}
          onChange={(e) => setToneProfileId(e.target.value || null)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">Select a tone profile</option>
          {toneProfiles.map((profile) => (
            <option key={profile.id} value={profile.id}>{profile.name}</option>
          ))}
        </select>
      </div>
      
      <div className="mb-6">
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
          Content
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={12}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Write your content here..."
        />
      </div>
    </div>
  );
};

export default ContentEditor;