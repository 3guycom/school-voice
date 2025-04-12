/**
 * Create School Form component
 * Handles school creation after the user has registered and logged in
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { School, Globe, AlertCircle } from 'lucide-react';

interface FormData {
  name: string;
  website: string;
}

const CreateSchoolForm = () => {
  const navigate = useNavigate();
  const { user, loadUserSchools } = useAuthStore();
  
  const [formData, setFormData] = React.useState<FormData>({
    name: '',
    website: '',
  });
  
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string>('');
  const [statusMessage, setStatusMessage] = React.useState<string>('');

  React.useEffect(() => {
    // Redirect to login if not authenticated
    if (!user) {
      navigate('/login', { state: { message: 'Please log in to create a school' } });
    }
  }, [user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user makes changes
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to create a school');
      return;
    }
    
    if (!formData.name.trim()) {
      setError('School name is required');
      return;
    }
    
    setLoading(true);
    setError('');
    setStatusMessage('Creating your school...');
    
    try {
      // Step 1: Create the school record
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .insert([{
          name: formData.name.trim(),
          website: formData.website.trim() || null
        }])
        .select()
        .single();

      if (schoolError) {
        console.error('❌ School creation error:', schoolError);
        throw new Error(`Failed to create school: ${schoolError.message}`);
      }
      
      if (!schoolData || !schoolData.id) {
        console.error('❌ No school data returned');
        throw new Error('School was created but no ID was returned');
      }
      
      console.log('✅ School created successfully with ID:', schoolData.id);
      
      // Step 2: Create school_members record to associate user as admin
      setStatusMessage('Setting you as school administrator...');
      
      const { error: memberError } = await supabase
        .from('school_members')
        .insert([{
          school_id: schoolData.id,
          user_id: user.id,
          role: 'admin'
        }]);
        
      if (memberError) {
        console.error('❌ School membership error:', memberError);
        // If this fails, clean up the school we created
        await supabase.from('schools').delete().eq('id', schoolData.id);
        throw new Error(`Failed to associate you with the school: ${memberError.message}`);
      }
      
      console.log('✅ User added as school admin');
      setStatusMessage('School created successfully!');
      
      // Refresh the user's schools
      await loadUserSchools();
      
      // Navigate to the school dashboard
      setTimeout(() => {
        navigate(`/${schoolData.id}/dashboard`, {
          state: { 
            message: 'School created successfully! Welcome to your dashboard.' 
          }
        });
      }, 1000);
      
    } catch (err: any) {
      console.error('❌ School creation error:', err);
      setError(err.message || 'Failed to create school. Please try again.');
      setStatusMessage('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Status message */}
      {statusMessage && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <div className="mr-3">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-600"></div>
            </div>
            <p className="text-sm font-medium text-blue-800">{statusMessage}</p>
          </div>
        </div>
      )}

      {/* School creation form */}
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name" className="flex items-center text-sm font-medium text-gray-700">
            <School className="h-4 w-4 mr-1" />
            School Name
          </label>
          <div className="mt-1">
            <input
              id="name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange}
              disabled={loading}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Enter your school's name"
            />
          </div>
        </div>

        <div>
          <label htmlFor="website" className="flex items-center text-sm font-medium text-gray-700">
            <Globe className="h-4 w-4 mr-1" />
            School Website (Optional)
          </label>
          <div className="mt-1">
            <input
              id="website"
              name="website"
              type="url"
              value={formData.website}
              onChange={handleChange}
              disabled={loading}
              placeholder="https://"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                Creating School...
              </div>
            ) : (
              'Create School'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateSchoolForm;