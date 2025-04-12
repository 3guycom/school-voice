/**
 * Type definitions for route configurations
 * Updated to include no-schools view instead of school selector
 */

export enum AppRoutes {
  // Public routes
  LOGIN = '/login',
  REGISTER = '/register',
  ACCEPT_INVITATION = '/invitation/:token',
  
  // No schools view (replaces school selection)
  CREATE_SCHOOL = '/create-school',
  NO_SCHOOLS = '/no-schools',
  
  // Protected routes (school-specific)
  DASHBOARD = '/:schoolId/dashboard',
  TONE_ANALYSIS = '/:schoolId/tone-analysis',
  CONTENT_CREATION = '/:schoolId/content-creation',
  CONTENT_EDITOR = '/:schoolId/content/:draftId',
  TONE_PROFILES = '/:schoolId/tone-profiles',
  TONE_PROFILE_DETAIL = '/:schoolId/tone-profiles/:profileId',
  SCHOOL_MEMBERS = '/:schoolId/members',
  INVITATIONS = '/:schoolId/invitations',
  SCHOOL_SETTINGS = '/:schoolId/settings',
  
  // Super admin routes
  SUPER_ADMIN = '/super-admin',
  SUPER_ADMIN_USERS = '/super-admin/users',
  SUPER_ADMIN_SCHOOLS = '/super-admin/schools',
  SUPER_ADMIN_AUDIT = '/super-admin/audit',
}