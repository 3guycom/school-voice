/**
 * CreateSchool page
 * Allows authenticated admin users to create a new school
 * Updated to restrict access to admin users only
 */

import React, { useEffect } from 'react';
import { BookOpen, AlertCircle } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import CreateSchoolForm from '../components/CreateSchoolForm';
import { useAuthStore } from '../stores/authStore';
import { AppRoutes } from '../types/routes';

const CreateSchool = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const message = location.state?.message;
  const { isAdmin, user } = useAuthStore();

  // Check if user is an admin before allowing school creation
  useEffect(() => {
    if (user && !isAdmin()) {
      // Redirect non-admin users
      navigate(AppRoutes.SCHOOLS, {
        state: { 
          message: 'Only administrators can create schools. Please contact your administrator.'
        }
      });
    }
  }, [isAdmin, user, navigate]);

  if (!isAdmin()) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <AlertCircle className="h-12 w-12 text-red-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Access Denied
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Only administrators can create schools
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <BookOpen className="h-12 w-12 text-indigo-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create Your School
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Set up your school to start managing its voice
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Success message from previous step */}
        {message && (
          <div className="mb-6 mx-4 p-4 sm:mx-0 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-medium text-green-800">{message}</p>
          </div>
        )}

        <CreateSchoolForm />

        <div className="mt-6 text-center">
          <span className="text-sm text-gray-600">
            Already have a school?{' '}
            <Link to="/schools" className="font-medium text-indigo-600 hover:text-indigo-500">
              View your schools
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
};

export default CreateSchool;