/**
 * ToneProfileDetail component
 * Displays detailed information about a specific tone profile
 * Allows admins to edit the profile settings
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

interface ToneProfile {
  id: string;
  name: string;
  dimensions: Record<string, number>;
  created_at: string;
  is_active: boolean;
  school_id: string;
}

const ToneProfileDetail: React.FC = () => {
  const { profileId, schoolId } = useParams<{ profileId: string; schoolId: string }>();
  const { isAdmin } = useAuthStore();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<ToneProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchProfile = async () => {
      if (!profileId) return;
      
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('tone_profiles')
          .select('*')
          .eq('id', profileId)
          .single();
          
        if (error) throw error;
        
        setProfile(data);
      } catch (err) {
        console.error('Error fetching tone profile:', err);
        setError('Failed to load tone profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [profileId]);
  
  const handleBack = () => {
    navigate(`/${schoolId}/tone-profiles`);
  };
  
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }
  
  if (error || !profile) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 my-4">
          <p className="text-red-700">{error || 'Profile not found'}</p>
        </div>
        <button
          onClick={handleBack}
          className="mt-4 inline-flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Profiles
        </button>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={handleBack}
          className="inline-flex items-center text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Profiles
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{profile.name}</h1>
            {profile.is_active && (
              <span className="bg-green-100 text-green-800 text-xs px-2.5 py-0.5 rounded mt-1 inline-block">
                Active
              </span>
            )}
          </div>
          
          {schoolId && isAdmin(schoolId) && (
            <button
              onClick={() => navigate(`/${schoolId}/tone-profiles/${profile.id}/edit`)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </button>
          )}
        </div>
        
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-700 mb-4">Tone Dimensions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(profile.dimensions).map(([key, value]) => (
              <div key={key} className="mb-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 capitalize">{key.replace('_', ' ')}</span>
                  <span className="text-gray-800 font-medium">{value}/10</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${(value / 10) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-lg font-medium text-gray-700 mb-4">Usage</h2>
          <p className="text-gray-600">
            This tone profile can be used when creating new content to ensure consistency with your school's communication style.
          </p>
          
          <div className="mt-6">
            <button
              onClick={() => navigate(`/${schoolId}/content-creation?profile=${profile.id}`)}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md"
            >
              Create Content with this Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToneProfileDetail;