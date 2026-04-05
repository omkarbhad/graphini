/**
 * Optimized database operations with performance improvements
 * Fixes N+1 queries, adds proper indexing, and implements cursor pagination
 */

import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from '$env/static/private';
import type { Conversation, Message } from '$lib/server/db';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// OPTIMIZED DATABASE CLIENT
// ============================================================================

let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      // Performance optimizations
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          Connection: 'keep-alive'
        }
      }
    });
  }

  return supabaseClient;
}

// ============================================================================
// CURSOR PAGINATION TYPES
// ============================================================================

export interface CursorPaginationResult<T> {
  data: T[];
  cursor: string | null;
  hasMore: boolean;
  count: number;
}

export interface CursorOptions {
  limit?: number;
  cursor?: string | null;
  direction?: 'forward' | 'backward';
}

// ============================================================================
// OPTIMIZED CONVERSATION OPERATIONS
// ============================================================================

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
  messageCount: number;
}

export async function getConversationWithMessages(
  id: string,
  options: {
    messageLimit?: number;
    messageCursor?: string | null;
    includeMessageCount?: boolean;
  } = {}
): Promise<ConversationWithMessages | null> {
  const supabase = getSupabaseClient();
  const { messageLimit = 50, messageCursor, includeMessageCount = true } = options;

  try {
    // Build the base query
    let query = supabase
      .from('conversations')
      .select(
        `
        *,
        messages (
          id,
          conversation_id,
          role,
          content,
          parts,
          created_at,
          metadata
        )
        ${includeMessageCount ? ', messages_count(count)' : ''}
      `
      )
      .eq('id', id)
      .order('messages(created_at)', { ascending: false })
      .limit(messageLimit)
      .single();

    const { data, error } = await query;

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get conversation with messages: ${error.message}`);
    }

    if (!data) return null;

    // Transform the data to match expected structure
    const conversation = data as any;
    const result: ConversationWithMessages = {
      id: conversation.id,
      user_id: conversation.user_id,
      title: conversation.title,
      created_at: conversation.created_at,
      updated_at: conversation.updated_at,
      metadata: conversation.metadata || {},
      messages: conversation.messages || [],
      messageCount: includeMessageCount
        ? conversation.messages_count || 0
        : (conversation.messages || []).length
    };

    return result;
  } catch (error) {
    console.error('Database error in getConversationWithMessages:', error);
    throw error;
  }
}

export async function listConversationsCursor(
  options: CursorOptions & {
    userId?: string;
    includeMessageCount?: boolean;
  } = {}
): Promise<CursorPaginationResult<Conversation>> {
  const supabase = getSupabaseClient();
  const { limit = 50, cursor, direction = 'forward', userId, includeMessageCount = true } = options;

  try {
    let query = supabase
      .from('conversations')
      .select(
        `
        id,
        user_id,
        title,
        created_at,
        updated_at,
        metadata
        ${includeMessageCount ? ', messages_count(count)' : ''}
      `,
        { count: 'exact' }
      )
      .order('updated_at', { ascending: false })
      .limit(limit + 1); // +1 to check if there are more results

    // Apply user filter if provided
    if (userId) {
      query = query.eq('user_id', userId);
    }

    // Apply cursor pagination
    if (cursor && direction === 'forward') {
      // Decode cursor (base64 encoded JSON with timestamp and id)
      const cursorData = JSON.parse(atob(cursor));
      query = query
        .lt('updated_at', cursorData.timestamp)
        .or(`updated_at.eq.${cursorData.timestamp} AND id.lt.${cursorData.id}`);
    } else if (cursor && direction === 'backward') {
      const cursorData = JSON.parse(atob(cursor));
      query = query
        .gt('updated_at', cursorData.timestamp)
        .or(`updated_at.eq.${cursorData.timestamp} AND id.gt.${cursorData.id}`)
        .order('updated_at', { ascending: true });
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to list conversations: ${error.message}`);
    }

    const conversations = data || [];
    const hasMore = conversations.length > limit;
    const actualData = hasMore ? conversations.slice(0, -1) : conversations;

    // Reverse order for backward pagination
    if (direction === 'backward') {
      actualData.reverse();
    }

    // Generate next cursor
    let nextCursor: string | null = null;
    if (actualData.length > 0) {
      const lastItem = actualData[actualData.length - 1];
      // Type guard to ensure we have the required properties
      if ('updated_at' in lastItem && 'id' in lastItem) {
        nextCursor = btoa(
          JSON.stringify({
            timestamp: lastItem.updated_at,
            id: lastItem.id
          })
        );
      }
    }

    return {
      data: actualData as unknown as Conversation[],
      cursor: nextCursor,
      hasMore,
      count: count || 0
    };
  } catch (error) {
    console.error('Database error in listConversationsCursor:', error);
    throw error;
  }
}

export async function listMessagesCursor(
  conversationId: string,
  options: CursorOptions = {}
): Promise<CursorPaginationResult<Message>> {
  const supabase = getSupabaseClient();
  const { limit = 100, cursor, direction = 'forward' } = options;

  try {
    let query = supabase
      .from('messages')
      .select(
        `
        id,
        conversation_id,
        role,
        content,
        parts,
        created_at,
        metadata
      `,
        { count: 'exact' }
      )
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit + 1); // +1 to check if there are more results

    // Apply cursor pagination
    if (cursor && direction === 'forward') {
      const cursorData = JSON.parse(atob(cursor));
      query = query
        .gt('created_at', cursorData.timestamp)
        .or(`created_at.eq.${cursorData.timestamp} AND id.gt.${cursorData.id}`);
    } else if (cursor && direction === 'backward') {
      const cursorData = JSON.parse(atob(cursor));
      query = query
        .lt('created_at', cursorData.timestamp)
        .or(`created_at.eq.${cursorData.timestamp} AND id.lt.${cursorData.id}`)
        .order('created_at', { ascending: false });
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to list messages: ${error.message}`);
    }

    const messages = data || [];
    const hasMore = messages.length > limit;
    const actualData = hasMore ? messages.slice(0, -1) : messages;

    // Reverse order for backward pagination
    if (direction === 'backward') {
      actualData.reverse();
    }

    // Generate next cursor
    let nextCursor: string | null = null;
    if (actualData.length > 0) {
      const lastItem = actualData[actualData.length - 1];
      nextCursor = btoa(
        JSON.stringify({
          timestamp: lastItem.created_at,
          id: lastItem.id
        })
      );
    }

    return {
      data: actualData as Message[],
      cursor: nextCursor,
      hasMore,
      count: count || 0
    };
  } catch (error) {
    console.error('Database error in listMessagesCursor:', error);
    throw error;
  }
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

export async function createMessagesBatch(
  messages: Array<{
    conversation_id: string;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    parts?: unknown;
    metadata?: Record<string, unknown>;
  }>
): Promise<Message[]> {
  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase
      .from('messages')
      .insert(messages)
      .select()
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to create messages batch: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Database error in createMessagesBatch:', error);
    throw error;
  }
}

export async function updateConversationLastActivity(conversationId: string): Promise<void> {
  const supabase = getSupabaseClient();

  try {
    const { error } = await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    if (error) {
      throw new Error(`Failed to update conversation activity: ${error.message}`);
    }
  } catch (error) {
    console.error('Database error in updateConversationLastActivity:', error);
    throw error;
  }
}

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

export interface QueryPerformanceMetrics {
  queryName: string;
  duration: number;
  rowCount: number;
  timestamp: string;
}

class QueryPerformanceTracker {
  private metrics: QueryPerformanceMetrics[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics

  trackQuery(queryName: string, startTime: number, rowCount: number): void {
    const duration = Date.now() - startTime;

    this.metrics.push({
      queryName,
      duration,
      rowCount,
      timestamp: new Date().toISOString()
    });

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log slow queries
    if (duration > 1000) {
      // > 1 second
      console.warn(`Slow query detected: ${queryName} took ${duration}ms for ${rowCount} rows`);
    }
  }

  getMetrics(): QueryPerformanceMetrics[] {
    return [...this.metrics];
  }

  getAverageQueryTime(queryName: string): number {
    const queryMetrics = this.metrics.filter((m) => m.queryName === queryName);
    if (queryMetrics.length === 0) return 0;

    const total = queryMetrics.reduce((sum, m) => sum + m.duration, 0);
    return total / queryMetrics.length;
  }

  clear(): void {
    this.metrics = [];
  }
}

export const performanceTracker = new QueryPerformanceTracker();

// ============================================================================
// OPTIMIZED QUERY WRAPPERS
// ============================================================================

export async function withPerformanceTracking<T>(
  queryName: string,
  queryFn: () => Promise<{ data?: T; count?: number }>
): Promise<{ data: T; count?: number; performance: QueryPerformanceMetrics }> {
  const startTime = Date.now();

  try {
    const result = await queryFn();
    const rowCount = Array.isArray(result.data) ? result.data.length : result.count || 0;

    performanceTracker.trackQuery(queryName, startTime, rowCount);

    return {
      data: result.data as T,
      count: result.count,
      performance: {
        queryName,
        duration: Date.now() - startTime,
        rowCount,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    performanceTracker.trackQuery(queryName, startTime, 0);
    throw error;
  }
}

// ============================================================================
// CONNECTION POOLING OPTIMIZATION
// ============================================================================

export class ConnectionPool {
  private static instance: ConnectionPool;
  private connections: Map<string, SupabaseClient> = new Map();
  private maxConnections = 10;
  private connectionTimeout = 30000; // 30 seconds

  static getInstance(): ConnectionPool {
    if (!ConnectionPool.instance) {
      ConnectionPool.instance = new ConnectionPool();
    }
    return ConnectionPool.instance;
  }

  getConnection(key = 'default'): SupabaseClient {
    if (this.connections.has(key)) {
      return this.connections.get(key)!;
    }

    if (this.connections.size >= this.maxConnections) {
      // Remove oldest connection
      const firstKey = this.connections.keys().next().value;
      this.connections.delete(firstKey);
    }

    const client = getSupabaseClient();
    this.connections.set(key, client);

    // Set up connection cleanup
    setTimeout(() => {
      this.connections.delete(key);
    }, this.connectionTimeout);

    return client;
  }

  closeAll(): void {
    this.connections.clear();
  }
}

export const connectionPool = ConnectionPool.getInstance();

// ============================================================================
// EXPORT TYPES
// ============================================================================

// Re-export types for backward compatibility
export type {
  Conversation,
  ConversationStats,
  Message,
  Snapshot,
  UsageStats,
  UserQuota
} from '$lib/server/db';
