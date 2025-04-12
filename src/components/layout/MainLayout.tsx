/**
 * Main layout component for the application
 * Provides school-specific navigation and sidebar
 * Updated to handle no schools scenario and direct navigation
 */

import React from 'react';
import { Link, Outlet, useParams, useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  FileText, 
  BarChart2, 
  Settings,
  LogOut,
  Menu,
  X,
  Users,
  Mail,
  ChevronDown,
  Home,
  Shield
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { AppRoutes } from '../../types/routes';

const MainLayout = () => {
  const { schoolId } = useParams<{ schoolId: string }>();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const { user, currentSchool, signOut, isAdmin, isSuperAdmin, setCurrentSchool } = useAuthStore();
  const navigate = useNavigate();

  // Basic routes available to all users
  const navItems = [
    { icon: Home, label: 'Dashboard', path: `/dashboard` },
    { icon: BarChart2, label: 'Tone Analysis', path: `/tone-analysis` },
    { icon: FileText, label: 'Content Creation', path: `/content-creation` },
    { icon: BookOpen, label: 'Tone Profiles', path: `/tone-profiles` },
  ];

  // Admin-only routes
  const adminItems = [
    { icon: Users, label: 'Members', path: `/members` },
    { icon: Mail, label: 'Invitations', path: `/invitations` },
    { icon: Settings, label: 'Settings', path: `/settings` },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate(AppRoutes.LOGIN);
  };

  // If the requested school doesn't match the current school, update current school
  React.useEffect(() => {
    if (schoolId && user?.schools && user.schools.length > 0) {
      const requestedSchool = user.schools.find(school => school.id === schoolId);
      if (requestedSchool && (!currentSchool || currentSchool.id !== schoolId)) {
        setCurrentSchool(requestedSchool);
      }
    }
  }, [schoolId, user, currentSchool, setCurrentSchool]);

  // If no schoolId is provided, redirect appropriately
  React.useEffect(() => {
    if (!schoolId) {
      if (isSuperAdmin()) {
        navigate('/super-admin');
      } else if (user?.schools && user.schools.length > 0) {
        navigate(`/${user.schools[0].id}/dashboard`);
      } else {
        navigate(AppRoutes.NO_SCHOOLS);
      }
    }
  }, [schoolId, navigate, user, isSuperAdmin]);

  // If the current schoolId isn't in the user's schools list, redirect
  React.useEffect(() => {
    if (schoolId && user?.schools && user.schools.length > 0) {
      if (!user.schools.some(school => school.id === schoolId)) {
        navigate(`/${user.schools[0].id}/dashboard`);
      }
    }
  }, [schoolId, user, navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Menu Button */}
      <button
        className="fixed top-4 right-4 z-50 p-2 rounded-lg bg-white shadow-lg md:hidden"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar Navigation */}
      <nav className={`
        fixed top-0 left-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-200 ease-in-out z-40
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-indigo-600">School Voice</h1>
          
          {/* Current School Display */}
          <div className="mt-4 relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-md hover:bg-gray-100"
            >
              <span className="truncate">{currentSchool?.name || 'No School Selected'}</span>
              {user?.schools && user.schools.length > 1 && (
                <ChevronDown size={16} className={`transform transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              )}
            </button>
            
            {isDropdownOpen && user?.schools && user.schools.length > 1 && (
              <div className="absolute w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                {user.schools.map(school => (
                  <Link
                    key={school.id}
                    to={`/${school.id}/dashboard`}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span>{school.name}</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100">
                        {school.role}
                      </span>
                    </div>
                  </Link>
                ))}
                
                {/* Super admin link */}
                {isSuperAdmin() && (
                  <Link
                    to="/super-admin"
                    className="block px-4 py-2 text-sm text-red-600 border-t border-gray-100 hover:bg-gray-100 flex items-center"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <Shield className="h-4 w-4 mr-1" />
                    Super Admin Panel
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="py-4">
          {/* Standard Navigation Items */}
          <div className="px-4 py-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-4">
              Features
            </p>
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={`/${schoolId}${item.path}`}
                className="flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon size={20} className="mr-3" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Admin-only Navigation Items */}
          {isAdmin(schoolId) && (
            <div className="px-4 py-2 mt-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-4">
                Administration
              </p>
              {adminItems.map((item) => (
                <Link
                  key={item.path}
                  to={`/${schoolId}${item.path}`}
                  className="flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <item.icon size={20} className="mr-3" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          )}
          
          {/* Super Admin Section */}
          {isSuperAdmin() && (
            <div className="px-4 py-2 mt-6">
              <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2 px-4">
                Super Admin
              </p>
              <Link
                to="/super-admin"
                className="flex items-center px-4 py-3 text-red-700 rounded-lg hover:bg-red-50 hover:text-red-800 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Shield size={20} className="mr-3" />
                <span>Admin Panel</span>
              </Link>
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
          <div className="flex items-center px-4 py-3 mb-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.displayName || user?.email}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.email}
              </p>
              {user?.isSuperAdmin && (
                <span className="mt-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                  Super Admin
                </span>
              )}
            </div>
          </div>
          
          <button 
            onClick={handleSignOut}
            className="flex items-center w-full px-4 py-3 text-gray-700 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={20} className="mr-3" />
            <span>Sign Out</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className={`
        transition-all duration-200 ease-in-out
        md:ml-64 p-6
      `}>
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;