/**
 * ToneProfiles page component
 * Updated to use stored procedure for fetching profiles
 */

import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

interface ToneProfile {
  id: string;
  name: string;
  dimensions: Record<string, number>;
  created_at: string;
  is_active: boolean;
}

const ToneProfiles: React.FC = () => {
  const { schoolId } = useParams<{ schoolId: string }>();
  const { user, isAdmin } = useAuthStore();
  const [profiles, setProfiles] = useState<ToneProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchProfiles = async () => {
      if (!schoolId) return;
      
      try {
        setLoading(true);
        const { data, error } = await supabase
          .rpc('get_tone_profiles', { p_school_id: schoolId });
          
        if (error) throw error;
        
        setProfiles(data || []);
      } catch (err) {
        console.error('Error fetching tone profiles:', err);
        setError('Failed to load tone profiles. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfiles();
  }, [schoolId]);
  
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tone profile?')) return;
    
    try {
      const { error } = await supabase
        .from('tone_profiles')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Update local state
      setProfiles(profiles.filter(profile => profile.id !== id));
    } catch (err) {
      console.error('Error deleting tone profile:', err);
      setError('Failed to delete tone profile. Please try again.');
    }
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
  
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 my-4">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Tone Profiles</h1>
        {isAdmin(schoolId) && (
          <Link 
            to="new" 
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Create Profile
          </Link>
        )}
      </div>
      
      {profiles.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h3 className="text-lg font-medium text-gray-700 mb-2">No tone profiles yet</h3>
          <p className="text-gray-500 mb-6">
            Create tone profiles to define your school's communication style.
          </p>
          {isAdmin(schoolId) && (
            <Link 
              to="new" 
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Create First Profile
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map((profile) => (
            <div 
              key={profile.id} 
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-medium text-gray-800 mb-2">
                  {profile.name}
                </h3>
                {profile.is_active && (
                  <span className="bg-green-100 text-green-800 text-xs px-2.5 py-0.5 rounded">
                    Active
                  </span>
                )}
              </div>
              
              <div className="mt-4 mb-6">
                {Object.entries(profile.dimensions).slice(0, 3).map(([key, value]) => (
                  <div key={key} className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 capitalize">{key.replace('_', ' ')}</span>
                      <span className="text-gray-800">{value}/10</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(value / 10) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
                
                {Object.keys(profile.dimensions).length > 3 && (
                  <p className="text-sm text-gray-500 mt-2">
                    +{Object.keys(profile.dimensions).length - 3} more dimensions
                  </p>
                )}
              </div>
              
              <div className="flex justify-between">
                <Link 
                  to={`/tone-profiles/${profile.id}`}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View Details
                </Link>
                
                {isAdmin(schoolId) && (
                  <div className="flex space-x-2">
                    <Link 
                      to={`/tone-profiles/${profile.id}/edit`}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button 
                      onClick={() => handleDelete(profile.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ToneProfiles;