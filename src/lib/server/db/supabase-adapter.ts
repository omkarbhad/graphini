/**
 * Supabase Database Adapter
 * Implements DatabaseAdapter interface using Supabase client
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { DatabaseAdapter } from './adapter';
import type {
  CacheEntry,
  CollaborationMember,
  Conversation,
  CreditBalance,
  CreditTransaction,
  DeductCreditsResult,
  FileRecord,
  Message,
  ModelPricing,
  PaginationOptions,
  Session,
  Snapshot,
  UsageStats,
  User,
  Workspace
} from './types';

export class SupabaseAdapter implements DatabaseAdapter {
  public client: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }

  // ── Auth ──────────────────────────────────────────────────────────────

  async createUser(data: {
    email: string;
    password_hash: string;
    display_name?: string;
  }): Promise<User> {
    const { data: user, error } = await this.client
      .from('users')
      .insert({
        email: data.email,
        password_hash: data.password_hash,
        display_name: data.display_name || null
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create user: ${error.message}`);
    return user;
  }

  async getUserById(id: string): Promise<User | null> {
    const { data, error } = await this.client.from('users').select('*').eq('id', id).single();
    if (error)
      return error.code === 'PGRST116'
        ? null
        : (() => {
            throw new Error(error.message);
          })();
    return data;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await this.client.from('users').select('*').eq('email', email).single();
    if (error)
      return error.code === 'PGRST116'
        ? null
        : (() => {
            throw new Error(error.message);
          })();
    return data;
  }

  async updateUser(
    id: string,
    data: Partial<
      Pick<
        User,
        | 'display_name'
        | 'avatar_url'
        | 'role'
        | 'is_active'
        | 'email_verified'
        | 'last_login_at'
        | 'metadata'
      >
    >
  ): Promise<User> {
    const { data: user, error } = await this.client
      .from('users')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`Failed to update user: ${error.message}`);
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    const { error } = await this.client.from('users').delete().eq('id', id);
    if (error) throw new Error(`Failed to delete user: ${error.message}`);
  }

  async listUsers(options?: {
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<{ users: User[]; total: number }> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    let query = this.client.from('users').select('*', { count: 'exact' });
    if (options?.search) {
      query = query.or(`email.ilike.%${options.search}%,display_name.ilike.%${options.search}%`);
    }
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw new Error(`Failed to list users: ${error.message}`);
    return { users: data || [], total: count || 0 };
  }

  // ── Sessions ──────────────────────────────────────────────────────────

  async createSession(data: {
    user_id: string;
    token: string;
    expires_at: string;
    ip_address?: string;
    user_agent?: string;
  }): Promise<Session> {
    const { data: session, error } = await this.client
      .from('sessions')
      .insert({
        user_id: data.user_id,
        token: data.token,
        expires_at: data.expires_at,
        ip_address: data.ip_address || null,
        user_agent: data.user_agent || null
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create session: ${error.message}`);
    return session;
  }

  async getSessionByToken(token: string): Promise<Session | null> {
    const { data, error } = await this.client
      .from('sessions')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single();
    if (error)
      return error.code === 'PGRST116'
        ? null
        : (() => {
            throw new Error(error.message);
          })();
    return data;
  }

  async deleteSession(id: string): Promise<void> {
    const { error } = await this.client.from('sessions').delete().eq('id', id);
    if (error) throw new Error(`Failed to delete session: ${error.message}`);
  }

  async deleteUserSessions(user_id: string): Promise<void> {
    const { error } = await this.client.from('sessions').delete().eq('user_id', user_id);
    if (error) throw new Error(`Failed to delete user sessions: ${error.message}`);
  }

  async cleanupExpiredSessions(): Promise<number> {
    const { data, error } = await this.client.rpc('cleanup_expired_sessions');
    if (error) return 0;
    return data as number;
  }

  // ── Workspaces ────────────────────────────────────────────────────────

  async createWorkspace(data: {
    owner_id: string;
    name: string;
    slug: string;
    description?: string;
  }): Promise<Workspace> {
    const { data: ws, error } = await this.client
      .from('workspaces')
      .insert({
        owner_id: data.owner_id,
        name: data.name,
        slug: data.slug,
        description: data.description || null
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create workspace: ${error.message}`);
    return ws;
  }

  async getWorkspace(id: string): Promise<Workspace | null> {
    const { data, error } = await this.client.from('workspaces').select('*').eq('id', id).single();
    if (error)
      return error.code === 'PGRST116'
        ? null
        : (() => {
            throw new Error(error.message);
          })();
    return data;
  }

  async listUserWorkspaces(user_id: string): Promise<Workspace[]> {
    // Workspaces the user owns or collaborates on
    const { data: owned, error: ownedErr } = await this.client
      .from('workspaces')
      .select('*')
      .eq('owner_id', user_id)
      .order('updated_at', { ascending: false });
    if (ownedErr) throw new Error(ownedErr.message);

    const { data: collabs, error: collabErr } = await this.client
      .from('collaboration_members')
      .select('workspace_id')
      .eq('user_id', user_id);
    if (collabErr) return owned || [];

    if (collabs && collabs.length > 0) {
      const collabIds = collabs
        .map((c) => c.workspace_id)
        .filter((id) => !(owned || []).some((w) => w.id === id));
      if (collabIds.length > 0) {
        const { data: collabWs } = await this.client
          .from('workspaces')
          .select('*')
          .in('id', collabIds)
          .order('updated_at', { ascending: false });
        return [...(owned || []), ...(collabWs || [])];
      }
    }
    return owned || [];
  }

  async updateWorkspace(
    id: string,
    data: Partial<Pick<Workspace, 'name' | 'description' | 'is_public' | 'settings'>>
  ): Promise<Workspace> {
    const { data: ws, error } = await this.client
      .from('workspaces')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`Failed to update workspace: ${error.message}`);
    return ws;
  }

  async deleteWorkspace(id: string): Promise<void> {
    const { error } = await this.client.from('workspaces').delete().eq('id', id);
    if (error) throw new Error(`Failed to delete workspace: ${error.message}`);
  }

  // ── Collaboration ─────────────────────────────────────────────────────

  async addCollaborator(data: {
    workspace_id: string;
    user_id: string;
    role: CollaborationMember['role'];
    invited_by?: string;
  }): Promise<CollaborationMember> {
    const { data: member, error } = await this.client
      .from('collaboration_members')
      .insert({
        workspace_id: data.workspace_id,
        user_id: data.user_id,
        role: data.role,
        invited_by: data.invited_by || null
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to add collaborator: ${error.message}`);
    return member;
  }

  async removeCollaborator(workspace_id: string, user_id: string): Promise<void> {
    const { error } = await this.client
      .from('collaboration_members')
      .delete()
      .eq('workspace_id', workspace_id)
      .eq('user_id', user_id);
    if (error) throw new Error(`Failed to remove collaborator: ${error.message}`);
  }

  async listCollaborators(
    workspace_id: string
  ): Promise<(CollaborationMember & { user?: User })[]> {
    const { data, error } = await this.client
      .from('collaboration_members')
      .select('*, users!collaboration_members_user_id_fkey(id, email, display_name, avatar_url)')
      .eq('workspace_id', workspace_id);
    if (error) throw new Error(error.message);
    return (data || []).map((m: any) => ({ ...m, user: m.users || undefined }));
  }

  async updateCollaboratorRole(
    workspace_id: string,
    user_id: string,
    role: CollaborationMember['role']
  ): Promise<void> {
    const { error } = await this.client
      .from('collaboration_members')
      .update({ role })
      .eq('workspace_id', workspace_id)
      .eq('user_id', user_id);
    if (error) throw new Error(error.message);
  }

  // ── Credits ───────────────────────────────────────────────────────────

  async getCreditBalance(user_id: string): Promise<CreditBalance | null> {
    const { data, error } = await this.client
      .from('credit_balances')
      .select('*')
      .eq('user_id', user_id)
      .single();
    if (error)
      return error.code === 'PGRST116'
        ? null
        : (() => {
            throw new Error(error.message);
          })();
    return data;
  }

  async deductCredits(
    user_id: string,
    amount: number,
    description?: string,
    model_id?: string,
    conversation_id?: string,
    message_id?: string
  ): Promise<DeductCreditsResult> {
    const { data, error } = await this.client
      .rpc('deduct_credits', {
        p_user_id: user_id,
        p_amount: amount,
        p_description: description || null,
        p_model_id: model_id || null,
        p_conversation_id: conversation_id || null,
        p_message_id: message_id || null
      })
      .single();
    if (error) return { success: false, new_balance: 0, error_message: error.message };
    const result = data as any;
    return {
      success: result.success,
      new_balance: result.new_balance,
      error_message: result.error_message
    };
  }

  async addCredits(
    user_id: string,
    amount: number,
    type: CreditTransaction['type'],
    description?: string
  ): Promise<CreditBalance> {
    // Update balance
    const { data: balance, error: balErr } = await this.client
      .from('credit_balances')
      .select('balance, lifetime_earned')
      .eq('user_id', user_id)
      .single();
    if (balErr) throw new Error(balErr.message);

    const currentBalance = balance?.balance || 0;
    const currentLifetimeEarned = (balance as any)?.lifetime_earned || 0;
    const newBalance = currentBalance + amount;
    const { data: updated, error: updErr } = await this.client
      .from('credit_balances')
      .update({
        balance: newBalance,
        lifetime_earned: currentLifetimeEarned + amount
      })
      .eq('user_id', user_id)
      .select()
      .single();
    if (updErr) throw new Error(updErr.message);

    // Record transaction
    await this.client.from('credit_transactions').insert({
      user_id,
      amount,
      balance_after: newBalance,
      type,
      description: description || null
    });

    return updated;
  }

  async getCreditTransactions(
    user_id: string,
    options?: PaginationOptions
  ): Promise<CreditTransaction[]> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    const { data, error } = await this.client
      .from('credit_transactions')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw new Error(error.message);
    return data || [];
  }

  // ── Model Pricing ─────────────────────────────────────────────────────

  async getModelPricing(model_id: string): Promise<ModelPricing | null> {
    const { data, error } = await this.client
      .from('model_pricing')
      .select('*')
      .eq('model_id', model_id)
      .single();
    if (error)
      return error.code === 'PGRST116'
        ? null
        : (() => {
            throw new Error(error.message);
          })();
    return data;
  }

  async listModelPricing(): Promise<ModelPricing[]> {
    const { data, error } = await this.client
      .from('model_pricing')
      .select('*')
      .eq('is_active', true)
      .order('model_name');
    if (error) throw new Error(error.message);
    return data || [];
  }

  async upsertModelPricing(data: Omit<ModelPricing, 'id'>): Promise<ModelPricing> {
    const { data: pricing, error } = await this.client
      .from('model_pricing')
      .upsert(data, { onConflict: 'model_id' })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return pricing;
  }

  // ── Conversations ─────────────────────────────────────────────────────

  async createConversation(data: {
    user_id?: string;
    workspace_id?: string;
    title?: string;
    metadata?: Record<string, unknown>;
  }): Promise<Conversation> {
    const { data: conv, error } = await this.client
      .from('conversations')
      .insert({
        user_id: data.user_id || null,
        workspace_id: data.workspace_id || null,
        title: data.title || null,
        metadata: data.metadata || {}
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create conversation: ${error.message}`);
    return conv;
  }

  async getConversation(id: string): Promise<Conversation | null> {
    const { data, error } = await this.client
      .from('conversations')
      .select('*')
      .eq('id', id)
      .single();
    if (error)
      return error.code === 'PGRST116'
        ? null
        : (() => {
            throw new Error(error.message);
          })();
    return data;
  }

  async listConversations(
    options?: {
      user_id?: string;
      workspace_id?: string;
      include_archived?: boolean;
    } & PaginationOptions
  ): Promise<Conversation[]> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    let query = this.client
      .from('conversations')
      .select('*')
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (options?.user_id) query = query.eq('user_id', options.user_id);
    if (options?.workspace_id) query = query.eq('workspace_id', options.workspace_id);
    if (!options?.include_archived) query = query.eq('is_archived', false);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to list conversations: ${error.message}`);
    return data || [];
  }

  async updateConversation(
    id: string,
    data: Partial<Pick<Conversation, 'title' | 'is_archived' | 'is_pinned' | 'metadata'>>
  ): Promise<Conversation> {
    const { data: conv, error } = await this.client
      .from('conversations')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`Failed to update conversation: ${error.message}`);
    return conv;
  }

  async deleteConversation(id: string): Promise<void> {
    const { error } = await this.client.from('conversations').delete().eq('id', id);
    if (error) throw new Error(`Failed to delete conversation: ${error.message}`);
  }

  // ── Messages ──────────────────────────────────────────────────────────

  async createMessage(data: {
    conversation_id: string;
    role: Message['role'];
    content: string;
    parts?: unknown;
    model_used?: string;
    tokens_used?: number;
    credits_charged?: number;
    metadata?: Record<string, unknown>;
  }): Promise<Message> {
    const { data: msg, error } = await this.client
      .from('messages')
      .insert({
        conversation_id: data.conversation_id,
        role: data.role,
        content: data.content,
        parts: data.parts || null,
        model_used: data.model_used || null,
        tokens_used: data.tokens_used || 0,
        credits_charged: data.credits_charged || 0,
        metadata: data.metadata || {}
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create message: ${error.message}`);
    return msg;
  }

  async listMessages(conversation_id: string, options?: PaginationOptions): Promise<Message[]> {
    const limit = options?.limit || 200;
    const offset = options?.offset || 0;
    const { data, error } = await this.client
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);
    if (error) throw new Error(`Failed to list messages: ${error.message}`);
    return data || [];
  }

  async deleteMessage(id: string): Promise<void> {
    const { error } = await this.client.from('messages').delete().eq('id', id);
    if (error) throw new Error(`Failed to delete message: ${error.message}`);
  }

  // ── Snapshots ─────────────────────────────────────────────────────────

  async createSnapshot(data: {
    conversation_id: string;
    message_id?: string;
    description?: string;
    state: Record<string, unknown>;
  }): Promise<Snapshot> {
    const { data: snap, error } = await this.client
      .from('snapshots')
      .insert({
        conversation_id: data.conversation_id,
        message_id: data.message_id || null,
        description: data.description || null,
        state: data.state
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create snapshot: ${error.message}`);
    return snap;
  }

  async listSnapshots(conversation_id: string): Promise<Snapshot[]> {
    const { data, error } = await this.client
      .from('snapshots')
      .select('*')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }

  async getSnapshot(id: string): Promise<Snapshot | null> {
    const { data, error } = await this.client.from('snapshots').select('*').eq('id', id).single();
    if (error)
      return error.code === 'PGRST116'
        ? null
        : (() => {
            throw new Error(error.message);
          })();
    return data;
  }

  async deleteSnapshot(id: string): Promise<void> {
    const { error } = await this.client.from('snapshots').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  // ── Files ─────────────────────────────────────────────────────────────

  async createFileRecord(data: Omit<FileRecord, 'id' | 'created_at'>): Promise<FileRecord> {
    const { data: file, error } = await this.client.from('files').insert(data).select().single();
    if (error) throw new Error(`Failed to create file record: ${error.message}`);
    return file;
  }

  async getFile(id: string): Promise<FileRecord | null> {
    const { data, error } = await this.client.from('files').select('*').eq('id', id).single();
    if (error)
      return error.code === 'PGRST116'
        ? null
        : (() => {
            throw new Error(error.message);
          })();
    return data;
  }

  async listConversationFiles(conversation_id: string): Promise<FileRecord[]> {
    const { data, error } = await this.client
      .from('files')
      .select('*')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }

  async deleteFile(id: string): Promise<void> {
    const { error } = await this.client.from('files').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  // ── Usage Stats ───────────────────────────────────────────────────────

  async createUsageStats(data: Omit<UsageStats, 'id' | 'created_at'>): Promise<UsageStats> {
    const { data: stats, error } = await this.client
      .from('usage_stats')
      .insert(data)
      .select()
      .single();
    if (error) throw new Error(`Failed to create usage stats: ${error.message}`);
    return stats;
  }

  // ── Cache ─────────────────────────────────────────────────────────────

  async cacheGet(key: string): Promise<CacheEntry | null> {
    const { data, error } = await this.client
      .from('cache_entries')
      .select('*')
      .eq('key', key)
      .single();
    if (error || !data) return null;
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      await this.cacheDelete(key);
      return null;
    }
    // Update hit count in background
    this.client
      .from('cache_entries')
      .update({ hit_count: data.hit_count + 1, last_accessed_at: new Date().toISOString() })
      .eq('key', key)
      .then();
    return data;
  }

  async cacheSet(
    key: string,
    value: unknown,
    options?: { ttl_seconds?: number; tags?: string[] }
  ): Promise<void> {
    const now = new Date();
    const expiresAt = options?.ttl_seconds
      ? new Date(now.getTime() + options.ttl_seconds * 1000).toISOString()
      : null;
    await this.client.from('cache_entries').upsert(
      {
        key,
        value,
        tags: options?.tags || [],
        expires_at: expiresAt,
        created_at: now.toISOString(),
        hit_count: 0,
        last_accessed_at: now.toISOString()
      },
      { onConflict: 'key' }
    );
  }

  async cacheDelete(key: string): Promise<boolean> {
    const { error } = await this.client.from('cache_entries').delete().eq('key', key);
    return !error;
  }

  async cacheDeleteByTag(tag: string): Promise<number> {
    const { data } = await this.client
      .from('cache_entries')
      .delete()
      .contains('tags', [tag])
      .select('key');
    return data?.length || 0;
  }

  async cacheClear(): Promise<void> {
    await this.client.from('cache_entries').delete().neq('key', '');
  }

  async cacheCleanup(): Promise<number> {
    const { data } = await this.client.rpc('cleanup_expired_cache');
    return (data as number) || 0;
  }

  // ── Enabled Models ──────────────────────────────────────────────────

  async listEnabledModels(onlyEnabled = true): Promise<any[]> {
    let query = this.client.from('enabled_models').select('*');
    if (onlyEnabled) query = query.eq('is_enabled', true);
    const { data, error } = await query.order('sort_order', { ascending: true });
    if (error) throw new Error(`Failed to list enabled models: ${error.message}`);
    return data || [];
  }

  async getEnabledModel(model_id: string): Promise<any | null> {
    const { data, error } = await this.client
      .from('enabled_models')
      .select('*')
      .eq('model_id', model_id)
      .single();
    if (error)
      return error.code === 'PGRST116'
        ? null
        : (() => {
            throw new Error(error.message);
          })();
    return data;
  }

  async upsertEnabledModel(data: any): Promise<any> {
    const { data: model, error } = await this.client
      .from('enabled_models')
      .upsert(data, { onConflict: 'model_id' })
      .select()
      .single();
    if (error) throw new Error(`Failed to upsert enabled model: ${error.message}`);
    return model;
  }

  async deleteEnabledModel(model_id: string): Promise<void> {
    const { error } = await this.client.from('enabled_models').delete().eq('model_id', model_id);
    if (error) throw new Error(`Failed to delete enabled model: ${error.message}`);
  }

  // ── App Settings (KV Store) ──────────────────────────────────────────

  async kvGet(user_id: string, category: string, key: string): Promise<unknown | null> {
    const { data, error } = await this.client
      .from('app_settings')
      .select('value')
      .eq('user_id', user_id)
      .eq('category', category)
      .eq('key', key)
      .single();
    if (error) return error.code === 'PGRST116' ? null : null;
    const raw = data?.value;
    if (raw && typeof raw === 'object' && '__kv' in (raw as Record<string, unknown>)) {
      return (raw as Record<string, unknown>).__kv;
    }
    return raw ?? null;
  }

  async kvSet(user_id: string, category: string, key: string, value: unknown): Promise<void> {
    const jsonbValue =
      value !== null && typeof value === 'object' && !Array.isArray(value)
        ? value
        : { __kv: value };
    const { error } = await this.client.from('app_settings').upsert(
      {
        user_id,
        category,
        key,
        value: jsonbValue as Record<string, unknown>,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id,category,key' }
    );
    if (error) throw new Error(`kvSet failed: ${error.message}`);
  }

  async kvDelete(user_id: string, category: string, key: string): Promise<void> {
    const { error } = await this.client
      .from('app_settings')
      .delete()
      .eq('user_id', user_id)
      .eq('category', category)
      .eq('key', key);
    if (error) throw new Error(`kvDelete failed: ${error.message}`);
  }

  async kvGetAll(
    user_id: string,
    category?: string
  ): Promise<{ category: string; key: string; value: unknown }[]> {
    let query = this.client
      .from('app_settings')
      .select('category, key, value')
      .eq('user_id', user_id);
    if (category) query = query.eq('category', category);
    const { data, error } = await query;
    if (error) throw new Error(`kvGetAll failed: ${error.message}`);
    return (data || []).map((r: any) => {
      const raw = r.value;
      const unwrapped = raw && typeof raw === 'object' && '__kv' in raw ? raw.__kv : raw;
      return { category: r.category, key: r.key, value: unwrapped };
    });
  }

  async kvSetBatch(
    user_id: string,
    entries: { category: string; key: string; value: unknown }[]
  ): Promise<void> {
    if (entries.length === 0) return;
    // Filter out entries where value is undefined (would become SQL NULL and violate NOT NULL)
    const validEntries = entries.filter((e) => e.value !== undefined);
    if (validEntries.length === 0) return;
    const rows = validEntries.map((e) => {
      // Wrap everything that isn't a plain object in __kv envelope for JSONB
      const v = e.value;
      const jsonbValue =
        v !== null && v !== undefined && typeof v === 'object' && !Array.isArray(v)
          ? v
          : { __kv: v ?? null };
      return {
        user_id,
        category: e.category,
        key: e.key,
        value: jsonbValue as Record<string, unknown>,
        updated_at: new Date().toISOString()
      };
    });
    const { error } = await this.client
      .from('app_settings')
      .upsert(rows, { onConflict: 'user_id,category,key' });
    if (error) throw new Error(`kvSetBatch failed: ${error.message}`);
  }

  // ── Health ────────────────────────────────────────────────────────────

  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.client.from('users').select('count').limit(1);
      return !error;
    } catch {
      return false;
    }
  }
}
