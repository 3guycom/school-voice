// src/pages/Login.tsx
// Updated to remove school selection screen and handle direct redirection
import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { AppRoutes } from '../routes';
import { Mail, Lock, AlertCircle } from 'lucide-react';

interface LocationState {
  message?: string;
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  
  const { signIn, user, isLoadingSchools: storeIsLoadingSchools, isSuperAdmin } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check for messages passed via location state
  useEffect(() => {
    const state = location.state as LocationState;
    if (state?.message) {
      setMessage(state.message);
    }
  }, [location]);
  
  // Redirect if already logged in
  useEffect(() => {
    if (user && !isLoading && !isLoadingSchools) {
      // If super admin, redirect to super admin dashboard
      if (isSuperAdmin()) {
        navigate('/super-admin');
      } else if (user.schools?.length > 0) {
        // If user has schools, go directly to the first school's dashboard
        navigate(`/${user.schools[0].id}/dashboard`);
      } else {
        // If user has no schools, go to no-schools view
        navigate(AppRoutes.NO_SCHOOLS);
      }
    }
  }, [user, navigate, isLoading, isLoadingSchools, isSuperAdmin]);
  
  // Update school loading status from store
  useEffect(() => {
    setIsLoadingSchools(storeIsLoadingSchools);
  }, [storeIsLoadingSchools]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { success, error } = await signIn(email, password);
      
      if (success) {
        // Login was successful - will redirect via useEffect when user is set
        setMessage("Login successful! Loading your information...");
      } else {
        setError(error?.message || 'Failed to sign in');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err?.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          {message && (
            <div className="mt-4 p-4 bg-green-50 rounded-md border border-green-200">
              <p className="text-sm text-green-700">{message}</p>
              {isLoadingSchools && (
                <div className="flex justify-center mt-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-green-500"></div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <div className="ml-1">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <div className="flex items-center">
                <span className="absolute z-10 pl-3 text-gray-400">
                  <Mail className="h-5 w-5" />
                </span>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none relative block w-full pl-10 px-3 py-2 border border-gray-300 rounded-t-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading || isLoadingSchools}
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="flex items-center">
                <span className="absolute z-10 pl-3 text-gray-400">
                  <Lock className="h-5 w-5" />
                </span>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none relative block w-full pl-10 px-3 py-2 border border-gray-300 rounded-b-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading || isLoadingSchools}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
                Don't have an account? Register
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || isLoadingSchools}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : isLoadingSchools ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                  Loading your information...
                </div>
              ) : (
                'Sign in'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}