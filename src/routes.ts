/**
 * Application routes configuration
 * Updated: Simplified routes to be a constant object for use in navigation
 * Removed: Router configuration (now handled in App.tsx)
 * Fixed: Removed duplicate route definitions
 */

export const AppRoutes = {
  LOGIN: '/login',
  REGISTER: '/register',
  SETTINGS: '/settings',
  SUPER_ADMIN: '/super-admin',
  CREATE_SCHOOL: '/create-school',
  NO_SCHOOLS: '/no-schools',
  SCHOOLS: '/schools',
  DASHBOARD: '/:schoolId/dashboard',
  MEMBERS: '/:schoolId/members',
  INVITATIONS: '/:schoolId/invitations',
  ACCEPT_INVITATION: '/invitations/:token',
  TONE_PROFILES: '/:schoolId/tone-profiles',
  TONE_PROFILE_DETAIL: '/:schoolId/tone-profiles/:profileId',
  CONTENT_CREATE: '/:schoolId/content/create',
  CONTENT_EDIT: '/:schoolId/content/:contentId',
  TONE_ANALYSIS: '/:schoolId/tone-analysis',
  COMPARISON: '/:schoolId/comparison'
} as const;