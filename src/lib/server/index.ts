/**
 * Server Library Index
 * Central export for all server-side modules
 */

// Database adapter (switchable)
export { getDb, resetDb } from './db';
export type { DatabaseAdapter } from './db';
export * from './db/types';

// Caching layer (L1 in-memory + L2 DB)
export {
  CacheService,
  cacheKey,
  conversationCacheKeys,
  getCache,
  modelCacheKeys,
  userCacheKeys,
  type CacheOptions
} from './cache';

// Auth
export {
  clearSessionCookie,
  createSessionCookie,
  extractToken,
  hashPassword,
  login,
  logout,
  register,
  validateSession,
  verifyPassword
} from './auth';

// State management (legacy - kept for backward compat)
export {
  adminDashboard,
  analyticsManager,
  settingsManager,
  stateManager,
  type AdminDashboardStats,
  type AnalyticsEvent,
  type AppSetting,
  type AppState,
  type RecentActivity,
  type StateType
} from './state-manager';
