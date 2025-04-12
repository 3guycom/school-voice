/**
 * School registration form component
 * Simplified to only handle user registration
 * School creation is now handled separately after successful registration
 * Fixed error handling for already registered users to properly detect Supabase error codes
 */

import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, Lock, AlertCircle } from 'lucide-react';

interface FormData {
  email: string;
  password: string;
}

const SchoolRegistrationForm = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = React.useState<FormData>({
    email: '',
    password: '',
  });
  
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string>('');
  const [detailedError, setDetailedError] = React.useState<string>('');
  const [showDetails, setShowDetails] = React.useState<boolean>(false);
  const [statusMessage, setStatusMessage] = React.useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user makes changes
    if (error) {
      setError('');
      setDetailedError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setDetailedError('');
    setStatusMessage('Creating your account...');
    
    try {
      // First make sure there's no active session
      await supabase.auth.signOut();
      
      // Create the user account
      const { data: userData, error: userError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`
        }
      });

      if (userError) {
        console.error('❌ User creation error:', userError);
        
        // Check for specific Supabase error code for already registered users
        if (userError.message === 'User already registered' || 
            (userError as any)?.code === 'user_already_exists') {
          throw new Error('This email is already registered. Please sign in instead or use a different email address.');
        }
        
        throw new Error(`Failed to create user account: ${userError.message}`);
      }
      
      if (!userData.user) {
        console.error('❌ No user data returned');
        throw new Error('User account could not be created');
      }
      
      console.log('✅ User created successfully with ID:', userData.user.id);
      setStatusMessage('Registration successful!');
      
      // Wait a moment to show the success message, then redirect to school creation
      setTimeout(() => {
        navigate('/create-school', {
          state: { 
            message: 'Account created successfully! Now let\'s set up your school.' 
          }
        });
      }, 1500);
      
    } catch (err: any) {
      console.error('❌ Registration error:', err);
      
      // Set a user-friendly error message
      setError(err.message || 'Registration failed. Please try again.');
      
      // Set a more detailed error for debugging
      if (err instanceof Error) {
        setDetailedError(err.stack || err.message);
      } else {
        setDetailedError(JSON.stringify(err));
      }
      
      setStatusMessage('');
      
      // Sign out to clean up any partial authentication state
      await supabase.auth.signOut();
      
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
          
          {error.includes('already registered') && (
            <div className="mt-2 pl-7">
              <Link to="/login" className="text-sm font-medium text-red-700 hover:text-red-900">
                Go to login page →
              </Link>
            </div>
          )}
          
          {/* Toggle for detailed error */}
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-red-700 underline"
            >
              {showDetails ? 'Hide details' : 'Show technical details'}
            </button>
            
            {showDetails && detailedError && (
              <pre className="mt-2 text-xs bg-red-50 p-2 rounded overflow-auto max-h-[200px]">
                {detailedError}
              </pre>
            )}
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

      {/* Registration form */}
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="flex items-center text-sm font-medium text-gray-700">
            <Mail className="h-4 w-4 mr-1" />
            Email address
          </label>
          <div className="mt-1">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="flex items-center text-sm font-medium text-gray-700">
            <Lock className="h-4 w-4 mr-1" />
            Password
          </label>
          <div className="mt-1">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
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
                Processing...
              </div>
            ) : (
              'Create Account'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SchoolRegistrationForm;