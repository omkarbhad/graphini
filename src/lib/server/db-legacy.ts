/**
 * Database client for server-side operations
 * Uses Supabase for PostgreSQL database access
 */

import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from '$env/static/private';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Database types
export interface Conversation {
  id: string;
  user_id: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  parts: unknown | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export interface Snapshot {
  id: string;
  conversation_id: string;
  message_id: string | null;
  description: string | null;
  state: Record<string, unknown>;
  created_at: string;
}

export interface UsageStats {
  id: string;
  conversation_id: string | null;
  message_id: string | null;
  model: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  estimated_cost_usd: number | null;
  created_at: string;
}

export interface ConversationStats {
  message_count: number;
  user_message_count: number;
  assistant_message_count: number;
  snapshot_count: number;
  total_tokens: number;
  estimated_cost_usd: number;
}

export interface UserQuota {
  within_quota: boolean;
  conversation_count: number;
  max_conversations: number;
  message_count: number;
  max_messages: number;
}

// Singleton Supabase client
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
      }
    });
  }

  return supabaseClient;
}

// ============================================================================
// CONVERSATION OPERATIONS
// ============================================================================

export async function createConversation(data: {
  user_id?: string | null;
  title?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<Conversation> {
  const supabase = getSupabaseClient();

  const { data: conversation, error } = await supabase
    .from('conversations')
    .insert({
      user_id: data.user_id || null,
      title: data.title || null,
      metadata: data.metadata || {}
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create conversation: ${error.message}`);
  }

  return conversation;
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.from('conversations').select('*').eq('id', id).single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to get conversation: ${error.message}`);
  }

  return data;
}

export async function listConversations(
  options: {
    user_id?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<Conversation[]> {
  const supabase = getSupabaseClient();
  const { user_id, limit = 50, offset = 0 } = options;

  let query = supabase
    .from('conversations')
    .select('*')
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (user_id) {
    query = query.eq('user_id', user_id);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list conversations: ${error.message}`);
  }

  return data || [];
}

export async function updateConversation(
  id: string,
  data: {
    title?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<Conversation> {
  const supabase = getSupabaseClient();

  const { data: conversation, error } = await supabase
    .from('conversations')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update conversation: ${error.message}`);
  }

  return conversation;
}

export async function deleteConversation(id: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from('conversations').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to delete conversation: ${error.message}`);
  }
}

// ============================================================================
// MESSAGE OPERATIONS
// ============================================================================

export async function createMessage(data: {
  conversation_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  parts?: unknown;
  metadata?: Record<string, unknown>;
}): Promise<Message> {
  const supabase = getSupabaseClient();

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: data.conversation_id,
      role: data.role,
      content: data.content,
      parts: data.parts || null,
      metadata: data.metadata || {}
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create message: ${error.message}`);
  }

  return message;
}

export async function listMessages(
  conversation_id: string,
  options: {
    limit?: number;
    offset?: number;
  } = {}
): Promise<Message[]> {
  const supabase = getSupabaseClient();
  const { limit = 100, offset = 0 } = options;

  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, role, content, parts, created_at, metadata')
    .eq('conversation_id', conversation_id)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to list messages: ${error.message}`);
  }

  return data || [];
}

export async function deleteMessage(id: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from('messages').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to delete message: ${error.message}`);
  }
}

// ============================================================================
// SNAPSHOT OPERATIONS
// ============================================================================

export async function createSnapshot(data: {
  conversation_id: string;
  message_id?: string | null;
  description?: string | null;
  state: Record<string, unknown>;
}): Promise<Snapshot> {
  const supabase = getSupabaseClient();

  const { data: snapshot, error } = await supabase
    .from('snapshots')
    .insert({
      conversation_id: data.conversation_id,
      message_id: data.message_id || null,
      description: data.description || null,
      state: data.state
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create snapshot: ${error.message}`);
  }

  return snapshot;
}

export async function listSnapshots(conversation_id: string): Promise<Snapshot[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('snapshots')
    .select('*')
    .eq('conversation_id', conversation_id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list snapshots: ${error.message}`);
  }

  return data || [];
}

export async function getSnapshot(id: string): Promise<Snapshot | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.from('snapshots').select('*').eq('id', id).single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get snapshot: ${error.message}`);
  }

  return data;
}

export async function deleteSnapshot(id: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from('snapshots').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to delete snapshot: ${error.message}`);
  }
}

// ============================================================================
// USAGE STATS OPERATIONS
// ============================================================================

export async function createUsageStats(data: {
  conversation_id?: string;
  message_id?: string;
  model: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  estimated_cost_usd?: number;
}): Promise<UsageStats> {
  const supabase = getSupabaseClient();

  const { data: stats, error } = await supabase
    .from('usage_stats')
    .insert({
      conversation_id: data.conversation_id || null,
      message_id: data.message_id || null,
      model: data.model,
      prompt_tokens: data.prompt_tokens || null,
      completion_tokens: data.completion_tokens || null,
      total_tokens: data.total_tokens || null,
      estimated_cost_usd: data.estimated_cost_usd || null
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create usage stats: ${error.message}`);
  }

  return stats;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export async function getConversationStats(conversation_id: string): Promise<ConversationStats> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .rpc('get_conversation_stats', { conv_id: conversation_id })
    .single();

  if (error) {
    throw new Error(`Failed to get conversation stats: ${error.message}`);
  }

  return data as ConversationStats;
}

export async function checkUserQuota(
  user_id: string,
  options: {
    max_conversations?: number;
    max_messages_per_conversation?: number;
  } = {}
): Promise<UserQuota> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .rpc('check_user_quota', {
      p_user_id: user_id,
      p_max_conversations: options.max_conversations || 10,
      p_max_messages_per_conversation: options.max_messages_per_conversation || 100
    })
    .single();

  if (error) {
    throw new Error(`Failed to check user quota: ${error.message}`);
  }

  return data as UserQuota;
}

export async function cleanupOldConversations(
  days_to_keep: number = 30
): Promise<{ deleted_count: number; freed_space_mb: number }> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .rpc('cleanup_old_conversations', { days_to_keep })
    .single();

  if (error) {
    throw new Error(`Failed to cleanup old conversations: ${error.message}`);
  }

  return data as { deleted_count: number; freed_space_mb: number };
}

export interface FileRecord {
  id: string;
  conversation_id: string;
  message_id: string | null;
  filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  storage_bucket: string;
  uploaded_by: string | null;
  created_at: string;
}

// ============================================================================
// FILE OPERATIONS
// ============================================================================

export async function createFileRecord(data: {
  conversation_id: string;
  message_id?: string | null;
  filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  storage_bucket?: string;
  uploaded_by?: string | null;
}): Promise<FileRecord> {
  const supabase = getSupabaseClient();

  const { data: fileRecord, error } = await supabase
    .from('files')
    .insert({
      conversation_id: data.conversation_id,
      message_id: data.message_id || null,
      filename: data.filename,
      original_name: data.original_name,
      mime_type: data.mime_type,
      size_bytes: data.size_bytes,
      storage_path: data.storage_path,
      storage_bucket: data.storage_bucket || 'chat-attachments',
      uploaded_by: data.uploaded_by || null
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create file record: ${error.message}`);
  }

  return fileRecord;
}

export async function getFile(id: string): Promise<FileRecord | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.from('files').select('*').eq('id', id).single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get file: ${error.message}`);
  }

  return data;
}

export async function listConversationFiles(conversation_id: string): Promise<FileRecord[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('conversation_id', conversation_id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list conversation files: ${error.message}`);
  }

  return data || [];
}

export async function deleteFile(id: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from('files').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to delete file record: ${error.message}`);
  }
}

export async function linkFilesToMessage(messageId: string, fileIds: string[]): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.rpc('link_files_to_message', {
    p_message_id: messageId,
    p_file_ids: fileIds
  });

  if (error) {
    throw new Error(`Failed to link files to message: ${error.message}`);
  }
}

export async function cleanupOrphanedFiles(daysOld: number = 1): Promise<number> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('cleanup_orphaned_files', { days_old: daysOld });

  if (error) {
    throw new Error(`Failed to cleanup orphaned files: ${error.message}`);
  }

  return data as number;
}

// ============================================================================
// USER MEMORIES (STUB IMPLEMENTATION)
// ============================================================================

export type MemoryType = 'user_preference' | 'context' | 'fact' | 'instruction';
export type MemorySource = 'user' | 'system' | 'inferred';

export interface UserMemory {
  id: string;
  user_id: string;
  memory_type: MemoryType;
  content: string;
  importance?: number;
  source?: MemorySource;
  expires_at?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export async function getUserMemories(
  userId: string,
  options?: { limit?: number }
): Promise<UserMemory[]> {
  // Stub implementation - returns empty array
  // TODO: Implement actual memory retrieval when user_memories table is created
  return [];
}

export async function createUserMemory(params: {
  user_id: string;
  memory_type: MemoryType;
  content: string;
  importance?: number;
  source?: MemorySource;
  expires_at?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<UserMemory> {
  // Stub implementation - throws error indicating feature not implemented
  throw new Error(
    'User memories feature not yet implemented. Please run database/add-user-memories.sql to set up the required tables.'
  );
}

export async function updateUserMemory(
  id: string,
  updates: Partial<Omit<UserMemory, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<UserMemory> {
  // Stub implementation
  throw new Error(
    'User memories feature not yet implemented. Please run database/add-user-memories.sql to set up the required tables.'
  );
}

export async function deleteUserMemory(id: string): Promise<void> {
  // Stub implementation
  throw new Error(
    'User memories feature not yet implemented. Please run database/add-user-memories.sql to set up the required tables.'
  );
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

export async function healthCheck(): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('conversations').select('count').limit(1);
    return !error;
  } catch {
    return false;
  }
}
