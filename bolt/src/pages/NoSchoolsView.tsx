/**
 * NoSchoolsView component
 * Displays a view for users who don't have any schools
 * Replaces the SchoolSelector component with a simplified view
 * Added logout button and proper super admin redirection
 */

import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { School, Plus, Mail, AlertCircle, LogOut, Shield } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { AppRoutes } from '../types/routes';

const NoSchoolsView: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoadingSchools, isAdmin, isSuperAdmin, signOut } = useAuthStore();
  const [error, setError] = React.useState<string | null>(null);
  
  // Handle redirection based on user status
  useEffect(() => {
    if (!isLoadingSchools) {
      if (user && isSuperAdmin()) {
        navigate('/super-admin', { replace: true });
      } else if (user?.schools && user.schools.length > 0) {
        navigate(`/${user.schools[0].id}/dashboard`, { replace: true });
      }
    }
  }, [user, isSuperAdmin, isLoadingSchools, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };
  
  // If still loading schools, show loading indicator
  if (isLoadingSchools) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-12">
        <div className="flex justify-center mb-6">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
        <p className="text-gray-600">Loading your information...</p>
      </div>
    );
  }
  
  // If not logged in, prompt to login
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-12">
        <div className="text-center mb-6">
          <p className="text-lg font-medium text-gray-900">Please sign in to access your schools.</p>
        </div>
        <Link
          to={AppRoutes.LOGIN}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  // If super admin, show appropriate message
  if (user && isSuperAdmin()) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <Shield className="mx-auto h-12 w-12 text-red-600" />
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Redirecting to Admin Panel
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {user.email}
            </p>
          </div>
          
          <div className="flex justify-center mt-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <School className="mx-auto h-12 w-12 text-indigo-600" />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome to School Voice
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {user.email}
          </p>
        </div>
        
        {error && (
          <div className="p-4 bg-red-50 rounded-md border border-red-200">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}
        
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          {isAdmin() ? (
            <>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">You don't have any schools yet</h3>
              <p className="text-gray-600 mb-8">
                Create your first school to start managing your school's communication style.
              </p>
              <div className="space-y-4">
                <button
                  onClick={() => navigate(AppRoutes.CREATE_SCHOOL)}
                  className="inline-flex items-center justify-center w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Plus className="mr-2 h-5 w-5" aria-hidden="true" />
                  Create a School
                </button>
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center justify-center w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-red-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <LogOut className="mr-2 h-5 w-5" />
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Waiting for an Invitation</h3>
              <div className="flex justify-center mb-6">
                <Mail className="h-16 w-16 text-indigo-100" />
              </div>
              <p className="text-gray-600 mb-4">
                You don't currently belong to any schools. You need an invitation from a school administrator to access the platform.
              </p>
              <p className="text-gray-600 mb-6">
                If you've already received an invitation via email, please check your inbox and click the invitation link.
              </p>
              <div className="text-sm text-gray-500 mb-8">
                Need help? Contact your school administrator or support.
              </div>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center justify-center w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-red-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <LogOut className="mr-2 h-5 w-5" />
                Sign Out
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoSchoolsView;