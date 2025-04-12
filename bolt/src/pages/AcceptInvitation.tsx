/**
 * Accept invitation page component
 * Handles verification and acceptance of school invitations
 */

import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Mail, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { useSchoolStore } from '../stores/schoolStore';
import { useAuthStore } from '../stores/authStore';
import { AppRoutes } from '../types/routes';

const AcceptInvitation = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { acceptInvitation, error, loading, successMessage } = useSchoolStore();
  const { user, loading: authLoading } = useAuthStore();
  
  const [processingStatus, setProcessingStatus] = React.useState<'pending' | 'success' | 'error'>('pending');

  React.useEffect(() => {
    // Only process the invitation if there's a token and the user is authenticated
    if (token && user && !authLoading) {
      const processInvitation = async () => {
        try {
          const result = await acceptInvitation(token);
          
          if (result) {
            setProcessingStatus('success');
            // Navigate to the school dashboard after a short delay
            setTimeout(() => {
              navigate(`/${result.schoolId}/dashboard`);
            }, 2000);
          } else {
            setProcessingStatus('error');
          }
        } catch (err) {
          setProcessingStatus('error');
        }
      };
      
      processInvitation();
    } else if (!authLoading && !user) {
      // If not authenticated, redirect to login with a return URL
      navigate(`${AppRoutes.LOGIN}?returnTo=${encodeURIComponent(`/invitation/${token}`)}`);
    }
  }, [token, user, authLoading, navigate, acceptInvitation]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Mail className="h-12 w-12 text-indigo-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          School Invitation
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Joining a school as a member
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {loading.invitations ? (
            <div className="text-center py-6">
              <div className="flex justify-center mb-4">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
              </div>
              <p className="text-base text-gray-700">Processing invitation...</p>
            </div>
          ) : processingStatus === 'success' || successMessage ? (
            <div className="text-center py-6">
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Invitation Accepted!</h3>
              <p className="text-base text-gray-700 mb-4">
                {successMessage || "You have successfully joined the school. Redirecting to dashboard..."}
              </p>
              <Link
                to="/"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          ) : error ? (
            <div className="text-center py-6">
              <div className="flex justify-center mb-4">
                <AlertCircle className="h-12 w-12 text-red-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Processing Invitation</h3>
              <p className="text-base text-red-700 mb-4">{error}</p>
              <div className="flex justify-center space-x-4">
                <Link
                  to={AppRoutes.LOGIN}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Sign In
                </Link>
                <Link
                  to={AppRoutes.SCHOOLS}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  My Schools
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="flex justify-center mb-4">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
              </div>
              <p className="text-base text-gray-700">Verifying invitation...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitation;