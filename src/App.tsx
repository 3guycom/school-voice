/**
 * Root application component with routing setup
 * Completely restructured for the new school-centric architecture
 * Implements role-based access and invitation flow
 * Removed dedicated school selection page in favor of direct navigation
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { AppRoutes } from './types/routes';

// Layouts
const MainLayout = React.lazy(() => import('./components/layout/MainLayout'));

// Auth and onboarding pages
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const CreateSchool = React.lazy(() => import('./pages/CreateSchool'));
const AcceptInvitation = React.lazy(() => import('./pages/AcceptInvitation'));
const NoSchoolsView = React.lazy(() => import('./pages/NoSchoolsView'));

// School features
const SchoolDashboard = React.lazy(() => import('./pages/SchoolDashboard'));
const ToneAnalysis = React.lazy(() => import('./pages/ToneAnalysis'));
const ContentCreation = React.lazy(() => import('./pages/ContentCreation'));
const ContentEditor = React.lazy(() => import('./pages/ContentEditor'));
const ToneProfiles = React.lazy(() => import('./pages/ToneProfiles'));
const ToneProfileDetail = React.lazy(() => import('./pages/ToneProfileDetail'));
const SchoolSettings = React.lazy(() => import('./pages/Settings'));
const SchoolMembers = React.lazy(() => import('./pages/SchoolMembers'));
const Invitations = React.lazy(() => import('./pages/Invitations'));

// Super Admin
const SuperAdmin = React.lazy(() => import('./pages/SuperAdmin'));

// Route with automatic redirection based on user status
const SmartRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoadingUser, isSuperAdmin } = useAuthStore();
  
  if (isLoadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to={AppRoutes.LOGIN} replace />;
  }
  
  // If super admin, redirect to super admin panel
  if (isSuperAdmin()) {
    return <Navigate to="/super-admin" replace />;
  }
  
  // If user has schools, redirect to their first school's dashboard
  if (user.schools && user.schools.length > 0) {
    return <Navigate to={`/${user.schools[0].id}/dashboard`} replace />;
  }
  
  // If user has no schools, show the No Schools view
  return <>{children}</>;
};

// Protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoadingUser } = useAuthStore();
  
  if (isLoadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to={AppRoutes.LOGIN} replace />;
  }
  
  return <>{children}</>;
};

// Admin route wrapper
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin } = useAuthStore();
  const { schoolId } = useParams<{ schoolId: string }>();
  
  // First check authentication
  if (!schoolId) {
    return <Navigate to={AppRoutes.NO_SCHOOLS} replace />;
  }
  
  // Check if user has admin role for this school
  if (!isAdmin(schoolId)) {
    return <Navigate to={AppRoutes.DASHBOARD.replace(':schoolId', schoolId)} replace />;
  }
  
  return <>{children}</>;
};

// Super Admin route wrapper
const SuperAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSuperAdmin } = useAuthStore();
  
  // Check if user is a super admin
  if (!isSuperAdmin()) {
    return <Navigate to={AppRoutes.NO_SCHOOLS} replace />;
  }
  
  return <>{children}</>;
};

function App() {
  const { initialize, isLoadingUser } = useAuthStore();

  React.useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <React.Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      }>
        <Routes>
          {/* Public Routes */}
          <Route path={AppRoutes.LOGIN} element={<Login />} />
          <Route path={AppRoutes.REGISTER} element={<Register />} />
          <Route path={AppRoutes.ACCEPT_INVITATION} element={<AcceptInvitation />} />

          {/* Super Admin Routes */}
          <Route path="/super-admin" element={
            <ProtectedRoute>
              <SuperAdminRoute>
                <SuperAdmin />
              </SuperAdminRoute>
            </ProtectedRoute>
          } />

          {/* Protected Routes */}
          <Route path={AppRoutes.CREATE_SCHOOL} element={
            <ProtectedRoute>
              <CreateSchool />
            </ProtectedRoute>
          } />
          <Route path={AppRoutes.NO_SCHOOLS} element={
            <SmartRoute>
              <NoSchoolsView />
            </SmartRoute>
          } />

          {/* School Layout Routes */}
          <Route path="/:schoolId" element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }>
            {/* Dashboard (default) */}
            <Route path="dashboard" element={<SchoolDashboard />} />
            
            {/* Tone Analysis */}
            <Route path="tone-analysis" element={<ToneAnalysis />} />
            
            {/* Content Creation */}
            <Route path="content-creation" element={<ContentCreation />} />
            <Route path="content/:draftId" element={<ContentEditor />} />
            
            {/* Tone Profiles */}
            <Route path="tone-profiles" element={<ToneProfiles />} />
            <Route path="tone-profiles/:profileId" element={<ToneProfileDetail />} />
            
            {/* Admin Routes */}
            <Route path="members" element={
              <AdminRoute>
                <SchoolMembers />
              </AdminRoute>
            } />
            
            <Route path="invitations" element={
              <AdminRoute>
                <Invitations />
              </AdminRoute>
            } />
            
            <Route path="settings" element={
              <AdminRoute>
                <SchoolSettings />
              </AdminRoute>
            } />
          </Route>

          {/* Redirects */}
          <Route path="/" element={<SmartRoute><NoSchoolsView /></SmartRoute>} />
          <Route path={AppRoutes.SCHOOLS} element={<SmartRoute><NoSchoolsView /></SmartRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </React.Suspense>
    </BrowserRouter>
  );
}

export default App;