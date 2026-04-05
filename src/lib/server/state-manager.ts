/**
 * Server-side State Manager
 * Manages app states, settings, and provides admin access to state data
 */

import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from '$env/static/private';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getCache } from './cache';

// Settings cache helper (simplified from old module)
const settingsCache = {
  key: (userId: string | null, category: string, key: string) =>
    ['settings', userId || 'global', category, key].filter(Boolean).join(':'),
  async getSetting<T>(userId: string | null, category: string, key: string): Promise<T | null> {
    return getCache().get<T>(this.key(userId, category, key));
  },
  async setSetting<T>(userId: string | null, category: string, key: string, value: T) {
    await getCache().set(this.key(userId, category, key), value, { ttlSeconds: 3600 });
  },
  async invalidateUser(userId: string | null) {
    await getCache().deleteByTag(`settings:${userId || 'global'}`);
  }
};

// ============================================================================
// TYPES
// ============================================================================

export type StateType = 'ui' | 'chat' | 'editor' | 'streaming' | 'error' | 'debug' | 'analytics';

export interface AppState {
  id: string;
  userId: string | null;
  sessionId: string | null;
  stateType: StateType;
  stateData: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: Date;
  expiresAt: Date | null;
}

export interface AppSetting {
  id: string;
  userId: string | null;
  category: string;
  key: string;
  value: unknown;
  description: string | null;
  isSensitive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminDashboardStats {
  totalConversations: number;
  totalMessages: number;
  totalUsers: number;
  activeSessions: number;
  cacheEntriesCount: number;
  cacheHitRate: number;
  totalTokensUsed: number;
  estimatedCostUsd: number;
  conversationsToday: number;
  messagesToday: number;
  errorsToday: number;
}

export interface RecentActivity {
  activityType: string;
  activityId: string;
  description: string;
  userId: string | null;
  createdAt: Date;
}

export interface AnalyticsEvent {
  eventType: string;
  userId?: string | null;
  sessionId?: string | null;
  conversationId?: string | null;
  eventData?: Record<string, unknown>;
}

// ============================================================================
// DATABASE CLIENT
// ============================================================================

let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseClient && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }
  return supabaseClient;
}

// ============================================================================
// SETTINGS MANAGER
// ============================================================================

export const settingsManager = {
  /**
   * Get a setting value
   */
  async get<T>(userId: string | null, category: string, key: string, defaultValue?: T): Promise<T> {
    // Try cache first
    const cached = await settingsCache.getSetting<T>(userId, category, key);
    if (cached !== null) {
      return cached;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return defaultValue as T;
    }

    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('category', category)
        .eq('key', key)
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        // Try global setting
        if (userId) {
          return this.get(null, category, key, defaultValue);
        }
        return defaultValue as T;
      }

      // Cache the result
      await settingsCache.setSetting(userId, category, key, data.value);
      return data.value as T;
    } catch {
      return defaultValue as T;
    }
  },

  /**
   * Set a setting value
   */
  async set(
    userId: string | null,
    category: string,
    key: string,
    value: unknown,
    options?: { description?: string; isSensitive?: boolean }
  ): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      await supabase.from('app_settings').upsert(
        {
          user_id: userId,
          category,
          key,
          value,
          description: options?.description,
          is_sensitive: options?.isSensitive || false
        },
        { onConflict: 'user_id,category,key' }
      );

      // Invalidate cache
      await settingsCache.invalidateUser(userId);
    } catch (e) {
      console.error('Failed to set setting:', e);
    }
  },

  /**
   * Get all settings for a user
   */
  async getAll(userId: string | null, category?: string): Promise<AppSetting[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    try {
      let query = supabase
        .from('app_settings')
        .select('*')
        .or(`user_id.eq.${userId},user_id.is.null`);

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query.order('category').order('key');

      if (error) return [];

      return (data || []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        category: row.category,
        key: row.key,
        value: row.value,
        description: row.description,
        isSensitive: row.is_sensitive,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
    } catch {
      return [];
    }
  },

  /**
   * Delete a setting
   */
  async delete(userId: string | null, category: string, key: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    try {
      let query = supabase.from('app_settings').delete().eq('category', category).eq('key', key);

      if (userId === null) {
        query = query.is('user_id', null);
      } else {
        query = query.eq('user_id', userId);
      }

      const { error } = await query;

      if (!error) {
        await settingsCache.invalidateUser(userId);
      }
      return !error;
    } catch {
      return false;
    }
  },

  /**
   * Get settings grouped by category
   */
  async getGrouped(userId: string | null): Promise<Record<string, AppSetting[]>> {
    const settings = await this.getAll(userId);
    return settings.reduce(
      (acc, setting) => {
        if (!acc[setting.category]) {
          acc[setting.category] = [];
        }
        acc[setting.category].push(setting);
        return acc;
      },
      {} as Record<string, AppSetting[]>
    );
  }
};

// ============================================================================
// STATE MANAGER
// ============================================================================

export const stateManager = {
  /**
   * Save app state
   */
  async save(state: Omit<AppState, 'id' | 'createdAt'>): Promise<string | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('app_states')
        .insert({
          user_id: state.userId,
          session_id: state.sessionId,
          state_type: state.stateType,
          state_data: state.stateData,
          metadata: state.metadata || {},
          expires_at: state.expiresAt?.toISOString()
        })
        .select('id')
        .single();

      if (error) return null;
      return data.id;
    } catch {
      return null;
    }
  },

  /**
   * Get state by ID
   */
  async get(id: string): Promise<AppState | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase.from('app_states').select('*').eq('id', id).single();

      if (error || !data) return null;

      return {
        id: data.id,
        userId: data.user_id,
        sessionId: data.session_id,
        stateType: data.state_type as StateType,
        stateData: data.state_data,
        metadata: data.metadata,
        createdAt: new Date(data.created_at),
        expiresAt: data.expires_at ? new Date(data.expires_at) : null
      };
    } catch {
      return null;
    }
  },

  /**
   * Get states by session
   */
  async getBySession(sessionId: string, limit = 100): Promise<AppState[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('app_states')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) return [];

      return (data || []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        sessionId: row.session_id,
        stateType: row.state_type as StateType,
        stateData: row.state_data,
        metadata: row.metadata,
        createdAt: new Date(row.created_at),
        expiresAt: row.expires_at ? new Date(row.expires_at) : null
      }));
    } catch {
      return [];
    }
  },

  /**
   * Get states by type
   */
  async getByType(stateType: StateType, limit = 100): Promise<AppState[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('app_states')
        .select('*')
        .eq('state_type', stateType)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) return [];

      return (data || []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        sessionId: row.session_id,
        stateType: row.state_type as StateType,
        stateData: row.state_data,
        metadata: row.metadata,
        createdAt: new Date(row.created_at),
        expiresAt: row.expires_at ? new Date(row.expires_at) : null
      }));
    } catch {
      return [];
    }
  },

  /**
   * Log an error state
   */
  async logError(
    error: Error | string,
    context: { userId?: string; sessionId?: string; metadata?: Record<string, unknown> } = {}
  ): Promise<string | null> {
    return this.save({
      userId: context.userId || null,
      sessionId: context.sessionId || null,
      stateType: 'error',
      stateData: {
        message: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      },
      metadata: context.metadata || {},
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
  },

  /**
   * Cleanup expired states
   */
  async cleanup(): Promise<number> {
    const supabase = getSupabaseClient();
    if (!supabase) return 0;

    try {
      const { data } = await supabase.rpc('cleanup_expired_states');
      return data as number;
    } catch {
      return 0;
    }
  }
};

// ============================================================================
// ANALYTICS MANAGER
// ============================================================================

export const analyticsManager = {
  /**
   * Track an event
   */
  async track(event: AnalyticsEvent): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      await supabase.from('analytics_events').insert({
        event_type: event.eventType,
        user_id: event.userId || null,
        session_id: event.sessionId || null,
        conversation_id: event.conversationId || null,
        event_data: event.eventData || {}
      });
    } catch (e) {
      console.error('Failed to track event:', e);
    }
  },

  /**
   * Get events by type
   */
  async getByType(eventType: string, limit = 100): Promise<AnalyticsEvent[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('event_type', eventType)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) return [];

      return (data || []).map((row) => ({
        eventType: row.event_type,
        userId: row.user_id,
        sessionId: row.session_id,
        conversationId: row.conversation_id,
        eventData: row.event_data
      }));
    } catch {
      return [];
    }
  },

  /**
   * Get event counts by type
   */
  async getEventCounts(since?: Date): Promise<Record<string, number>> {
    const supabase = getSupabaseClient();
    if (!supabase) return {};

    try {
      let query = supabase.from('analytics_events').select('event_type');

      if (since) {
        query = query.gte('created_at', since.toISOString());
      }

      const { data, error } = await query;
      if (error) return {};

      return (data || []).reduce(
        (acc, row) => {
          acc[row.event_type] = (acc[row.event_type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
    } catch {
      return {};
    }
  }
};

// ============================================================================
// ADMIN DASHBOARD
// ============================================================================

export const adminDashboard = {
  /**
   * Get dashboard stats
   */
  async getStats(): Promise<AdminDashboardStats> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        totalConversations: 0,
        totalMessages: 0,
        totalUsers: 0,
        activeSessions: 0,
        cacheEntriesCount: 0,
        cacheHitRate: 0,
        totalTokensUsed: 0,
        estimatedCostUsd: 0,
        conversationsToday: 0,
        messagesToday: 0,
        errorsToday: 0
      };
    }

    try {
      const { data, error } = await supabase.rpc('get_admin_dashboard_stats').single();

      if (error) throw error;

      const cacheStats = await getCache().getStats();
      const statsData = data as Record<string, unknown>;

      return {
        totalConversations: Number(statsData.total_conversations) || 0,
        totalMessages: Number(statsData.total_messages) || 0,
        totalUsers: Number(statsData.total_users) || 0,
        activeSessions: Number(statsData.active_sessions) || 0,
        cacheEntriesCount: cacheStats.entries,
        cacheHitRate: cacheStats.hitRate,
        totalTokensUsed: Number(statsData.total_tokens_used) || 0,
        estimatedCostUsd: Number(statsData.estimated_cost_usd) || 0,
        conversationsToday: Number(statsData.conversations_today) || 0,
        messagesToday: Number(statsData.messages_today) || 0,
        errorsToday: Number(statsData.errors_today) || 0
      };
    } catch (e) {
      console.error('Failed to get dashboard stats:', e);
      return {
        totalConversations: 0,
        totalMessages: 0,
        totalUsers: 0,
        activeSessions: 0,
        cacheEntriesCount: 0,
        cacheHitRate: 0,
        totalTokensUsed: 0,
        estimatedCostUsd: 0,
        conversationsToday: 0,
        messagesToday: 0,
        errorsToday: 0
      };
    }
  },

  /**
   * Get recent activity
   */
  async getRecentActivity(limit = 50): Promise<RecentActivity[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    try {
      const { data, error } = await supabase.rpc('get_recent_activity', { p_limit: limit });

      if (error) return [];

      return (data || []).map((row: any) => ({
        activityType: row.activity_type,
        activityId: row.activity_id,
        description: row.description,
        userId: row.user_id,
        createdAt: new Date(row.created_at)
      }));
    } catch {
      return [];
    }
  },

  /**
   * Get all conversations (for admin)
   */
  async getAllConversations(options: { limit?: number; offset?: number } = {}): Promise<any[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { limit = 50, offset = 0 } = options;

    try {
      // First try a simple query without aggregates to see if it works
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching conversations:', error);
        return [];
      }

      // If we got data, try to enrich it with message counts separately
      if (data && data.length > 0) {
        const conversationIds = data.map((conv) => conv.id);

        // Get message counts for each conversation
        const { data: messageCounts, error: countError } = await supabase
          .from('messages')
          .select('conversation_id')
          .in('conversation_id', conversationIds);

        if (!countError && messageCounts) {
          const counts = messageCounts.reduce(
            (acc, msg) => {
              acc[msg.conversation_id] = (acc[msg.conversation_id] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          );

          // Add message counts to conversations
          return data.map((conv) => ({
            ...conv,
            message_count: counts[conv.id] || 0
          }));
        }
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error in getAllConversations:', error);
      return [];
    }
  },

  /**
   * Get all settings (for admin)
   */
  async getAllSettings(): Promise<AppSetting[]> {
    return settingsManager.getAll(null);
  },

  /**
   * Get all errors (for admin)
   */
  async getErrors(limit = 100): Promise<AppState[]> {
    return stateManager.getByType('error', limit);
  },

  /**
   * Get cache info
   */
  async getCacheInfo() {
    const stats = getCache().getStats();
    return { stats, entries: [] };
  },

  /**
   * Get messages for a specific conversation (for admin)
   */
  async getConversationMessages(conversationId: string): Promise<any[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching conversation messages:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error in getConversationMessages:', error);
      return [];
    }
  },

  /**
   * Log admin action
   */
  async logAction(
    adminUserId: string | null,
    action: string,
    resourceType: string,
    resourceId?: string,
    details?: { oldValue?: unknown; newValue?: unknown; ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      await supabase.from('admin_audit_log').insert({
        admin_user_id: adminUserId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        old_value: details?.oldValue,
        new_value: details?.newValue,
        ip_address: details?.ipAddress,
        user_agent: details?.userAgent
      });
    } catch (e) {
      console.error('Failed to log admin action:', e);
    }
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export { getCache } from './cache';
