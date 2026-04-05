/**
 * Neon Database Adapter — implements DatabaseAdapter using Drizzle ORM + Neon serverless driver
 */

import { neon } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { and, asc, desc, eq, gt, ilike, inArray, not, or, sql } from 'drizzle-orm';
import type { DatabaseAdapter } from './adapter';
import type {
  CacheEntry,
  CollaborationMember,
  Conversation,
  CreditBalance,
  CreditTransaction,
  DeductCreditsResult,
  EnabledModel,
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
import * as schema from './schema';

export class NeonAdapter implements DatabaseAdapter {
  public db: NeonHttpDatabase<typeof schema>;

  constructor(connectionString: string) {
    const client = neon(connectionString);
    this.db = drizzle(client, { schema });
  }

  // ── Auth ──────────────────────────────────────────────────────────────

  async createUser(data: {
    email: string;
    password_hash: string;
    display_name?: string;
  }): Promise<User> {
    const [user] = await this.db
      .insert(schema.users)
      .values({
        email: data.email,
        password_hash: data.password_hash,
        display_name: data.display_name ?? null
      })
      .returning();
    return this.mapUser(user);
  }

  async getUserById(id: string): Promise<User | null> {
    const [user] = await this.db.select().from(schema.users).where(eq(schema.users.id, id));
    return user ? this.mapUser(user) : null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const [user] = await this.db.select().from(schema.users).where(eq(schema.users.email, email));
    return user ? this.mapUser(user) : null;
  }

  async getUserByFirebaseUid(firebase_uid: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.firebase_uid, firebase_uid));
    return user ? this.mapUser(user) : null;
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
    const updateData: Record<string, unknown> = {};
    if (data.display_name !== undefined) updateData.display_name = data.display_name;
    if (data.avatar_url !== undefined) updateData.avatar_url = data.avatar_url;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    if (data.email_verified !== undefined) updateData.email_verified = data.email_verified;
    if (data.last_login_at !== undefined)
      updateData.last_login_at = new Date(data.last_login_at as string);
    if (data.metadata !== undefined) updateData.metadata = data.metadata;

    const [user] = await this.db
      .update(schema.users)
      .set(updateData)
      .where(eq(schema.users.id, id))
      .returning();
    return this.mapUser(user);
  }

  async deleteUser(id: string): Promise<void> {
    await this.db.delete(schema.users).where(eq(schema.users.id, id));
  }

  async listUsers(
    options?: PaginationOptions & { search?: string }
  ): Promise<{ users: User[]; total: number }> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    let where = undefined;
    if (options?.search) {
      const pattern = `%${options.search}%`;
      where = or(ilike(schema.users.email, pattern), ilike(schema.users.display_name, pattern));
    }

    const rows = await this.db
      .select()
      .from(schema.users)
      .where(where)
      .orderBy(desc(schema.users.created_at))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.users)
      .where(where);

    return { users: rows.map((r) => this.mapUser(r)), total: count };
  }

  // ── Sessions ──────────────────────────────────────────────────────────

  async createSession(data: {
    user_id: string;
    token: string;
    expires_at: string;
    ip_address?: string;
    user_agent?: string;
  }): Promise<Session> {
    const [session] = await this.db
      .insert(schema.sessions)
      .values({
        user_id: data.user_id,
        token: data.token,
        expires_at: new Date(data.expires_at),
        ip_address: data.ip_address ?? null,
        user_agent: data.user_agent ?? null
      })
      .returning();
    return this.mapSession(session);
  }

  async getSessionByToken(token: string): Promise<Session | null> {
    const [session] = await this.db
      .select()
      .from(schema.sessions)
      .where(
        and(eq(schema.sessions.token, token), gt(schema.sessions.expires_at, new Date()))
      );
    return session ? this.mapSession(session) : null;
  }

  async deleteSession(id: string): Promise<void> {
    await this.db.delete(schema.sessions).where(eq(schema.sessions.id, id));
  }

  async deleteUserSessions(user_id: string): Promise<void> {
    await this.db.delete(schema.sessions).where(eq(schema.sessions.user_id, user_id));
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.db
      .delete(schema.sessions)
      .where(sql`${schema.sessions.expires_at} < NOW()`)
      .returning({ id: schema.sessions.id });
    return result.length;
  }

  // ── Workspaces ────────────────────────────────────────────────────────

  async createWorkspace(data: {
    owner_id: string;
    name: string;
    slug: string;
    description?: string;
  }): Promise<Workspace> {
    const [ws] = await this.db
      .insert(schema.workspaces)
      .values({
        owner_id: data.owner_id,
        name: data.name,
        slug: data.slug,
        description: data.description ?? null
      })
      .returning();
    return this.mapWorkspace(ws);
  }

  async getWorkspace(id: string): Promise<Workspace | null> {
    const [ws] = await this.db
      .select()
      .from(schema.workspaces)
      .where(eq(schema.workspaces.id, id));
    return ws ? this.mapWorkspace(ws) : null;
  }

  async listUserWorkspaces(user_id: string): Promise<Workspace[]> {
    const owned = await this.db
      .select()
      .from(schema.workspaces)
      .where(eq(schema.workspaces.owner_id, user_id))
      .orderBy(desc(schema.workspaces.updated_at));

    const collabs = await this.db
      .select({ workspace_id: schema.collaborationMembers.workspace_id })
      .from(schema.collaborationMembers)
      .where(eq(schema.collaborationMembers.user_id, user_id));

    const ownedIds = new Set(owned.map((w) => w.id));
    const collabIds = collabs.map((c) => c.workspace_id).filter((id) => !ownedIds.has(id));

    if (collabIds.length > 0) {
      const collabWs = await this.db
        .select()
        .from(schema.workspaces)
        .where(inArray(schema.workspaces.id, collabIds))
        .orderBy(desc(schema.workspaces.updated_at));
      return [...owned, ...collabWs].map((w) => this.mapWorkspace(w));
    }

    return owned.map((w) => this.mapWorkspace(w));
  }

  async updateWorkspace(
    id: string,
    data: Partial<Pick<Workspace, 'name' | 'description' | 'is_public' | 'settings'>>
  ): Promise<Workspace> {
    const [ws] = await this.db
      .update(schema.workspaces)
      .set(data)
      .where(eq(schema.workspaces.id, id))
      .returning();
    return this.mapWorkspace(ws);
  }

  async deleteWorkspace(id: string): Promise<void> {
    await this.db.delete(schema.workspaces).where(eq(schema.workspaces.id, id));
  }

  // ── Collaboration ─────────────────────────────────────────────────────

  async addCollaborator(data: {
    workspace_id: string;
    user_id: string;
    role: CollaborationMember['role'];
    invited_by?: string;
  }): Promise<CollaborationMember> {
    const [member] = await this.db
      .insert(schema.collaborationMembers)
      .values({
        workspace_id: data.workspace_id,
        user_id: data.user_id,
        role: data.role,
        invited_by: data.invited_by ?? null
      })
      .returning();
    return this.mapCollabMember(member);
  }

  async removeCollaborator(workspace_id: string, user_id: string): Promise<void> {
    await this.db
      .delete(schema.collaborationMembers)
      .where(
        and(
          eq(schema.collaborationMembers.workspace_id, workspace_id),
          eq(schema.collaborationMembers.user_id, user_id)
        )
      );
  }

  async listCollaborators(
    workspace_id: string
  ): Promise<(CollaborationMember & { user?: User })[]> {
    const rows = await this.db
      .select()
      .from(schema.collaborationMembers)
      .leftJoin(schema.users, eq(schema.collaborationMembers.user_id, schema.users.id))
      .where(eq(schema.collaborationMembers.workspace_id, workspace_id));

    return rows.map((r) => ({
      ...this.mapCollabMember(r.collaboration_members),
      user: r.users
        ? {
            id: r.users.id,
            email: r.users.email,
            display_name: r.users.display_name,
            avatar_url: r.users.avatar_url
          }
        : undefined
    })) as (CollaborationMember & { user?: User })[];
  }

  async updateCollaboratorRole(
    workspace_id: string,
    user_id: string,
    role: CollaborationMember['role']
  ): Promise<void> {
    await this.db
      .update(schema.collaborationMembers)
      .set({ role })
      .where(
        and(
          eq(schema.collaborationMembers.workspace_id, workspace_id),
          eq(schema.collaborationMembers.user_id, user_id)
        )
      );
  }

  // ── Credits ───────────────────────────────────────────────────────────

  async getCreditBalance(user_id: string): Promise<CreditBalance | null> {
    const [row] = await this.db
      .select()
      .from(schema.creditBalances)
      .where(eq(schema.creditBalances.user_id, user_id));
    return row ? this.mapCreditBalance(row) : null;
  }

  async deductCredits(
    user_id: string,
    amount: number,
    description?: string,
    model_id?: string,
    conversation_id?: string,
    message_id?: string
  ): Promise<DeductCreditsResult> {
    // Use the SQL function if available, otherwise do it in-app
    try {
      const [result] = await this.db.execute<{
        success: boolean;
        new_balance: number;
        error_message: string | null;
      }>(
        sql`SELECT * FROM deduct_credits(
          ${user_id}::uuid,
          ${amount}::int,
          ${description ?? null}::text,
          ${model_id ?? null}::text,
          ${conversation_id ?? null}::uuid,
          ${message_id ?? null}::uuid
        )`
      );
      return {
        success: result.success,
        new_balance: result.new_balance,
        error_message: result.error_message
      };
    } catch {
      // Fallback: manual deduction
      const balance = await this.getCreditBalance(user_id);
      if (!balance) return { success: false, new_balance: 0, error_message: 'Balance not found' };
      if (balance.balance < amount)
        return {
          success: false,
          new_balance: balance.balance,
          error_message: 'Insufficient credits'
        };

      const newBalance = balance.balance - amount;
      await this.db
        .update(schema.creditBalances)
        .set({ balance: newBalance, lifetime_spent: balance.lifetime_spent + amount })
        .where(eq(schema.creditBalances.user_id, user_id));

      await this.db.insert(schema.creditTransactions).values({
        user_id,
        amount: -amount,
        balance_after: newBalance,
        type: 'usage',
        description: description ?? null,
        model_id: model_id ?? null,
        conversation_id: conversation_id ?? null,
        message_id: message_id ?? null
      });

      return { success: true, new_balance: newBalance, error_message: null };
    }
  }

  async addCredits(
    user_id: string,
    amount: number,
    type: CreditTransaction['type'],
    description?: string
  ): Promise<CreditBalance> {
    const balance = await this.getCreditBalance(user_id);
    if (!balance) throw new Error('User credit balance not found');

    const newBalance = balance.balance + amount;
    const [updated] = await this.db
      .update(schema.creditBalances)
      .set({
        balance: newBalance,
        lifetime_earned: balance.lifetime_earned + amount
      })
      .where(eq(schema.creditBalances.user_id, user_id))
      .returning();

    await this.db.insert(schema.creditTransactions).values({
      user_id,
      amount,
      balance_after: newBalance,
      type,
      description: description ?? null
    });

    return this.mapCreditBalance(updated);
  }

  async getCreditTransactions(
    user_id: string,
    options?: PaginationOptions
  ): Promise<CreditTransaction[]> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    const rows = await this.db
      .select()
      .from(schema.creditTransactions)
      .where(eq(schema.creditTransactions.user_id, user_id))
      .orderBy(desc(schema.creditTransactions.created_at))
      .limit(limit)
      .offset(offset);
    return rows.map((r) => this.mapCreditTransaction(r));
  }

  // ── Model Pricing ─────────────────────────────────────────────────────

  async getModelPricing(model_id: string): Promise<ModelPricing | null> {
    const [row] = await this.db
      .select()
      .from(schema.modelPricing)
      .where(eq(schema.modelPricing.model_id, model_id));
    return row ? this.mapModelPricing(row) : null;
  }

  async listModelPricing(): Promise<ModelPricing[]> {
    const rows = await this.db
      .select()
      .from(schema.modelPricing)
      .where(eq(schema.modelPricing.is_active, true))
      .orderBy(asc(schema.modelPricing.model_name));
    return rows.map((r) => this.mapModelPricing(r));
  }

  async upsertModelPricing(data: Omit<ModelPricing, 'id'>): Promise<ModelPricing> {
    const [row] = await this.db
      .insert(schema.modelPricing)
      .values({
        model_id: data.model_id,
        model_name: data.model_name,
        provider: data.provider,
        credits_per_request: data.credits_per_request,
        credits_per_1k_input_tokens: String(data.credits_per_1k_input_tokens),
        credits_per_1k_output_tokens: String(data.credits_per_1k_output_tokens),
        is_free: data.is_free,
        is_active: data.is_active,
        metadata: data.metadata
      })
      .onConflictDoUpdate({
        target: schema.modelPricing.model_id,
        set: {
          model_name: data.model_name,
          provider: data.provider,
          credits_per_request: data.credits_per_request,
          credits_per_1k_input_tokens: String(data.credits_per_1k_input_tokens),
          credits_per_1k_output_tokens: String(data.credits_per_1k_output_tokens),
          is_free: data.is_free,
          is_active: data.is_active,
          metadata: data.metadata
        }
      })
      .returning();
    return this.mapModelPricing(row);
  }

  // ── Conversations ─────────────────────────────────────────────────────

  async createConversation(data: {
    user_id?: string;
    workspace_id?: string;
    title?: string;
    metadata?: Record<string, unknown>;
  }): Promise<Conversation> {
    const [conv] = await this.db
      .insert(schema.conversations)
      .values({
        user_id: data.user_id ?? null,
        workspace_id: data.workspace_id ?? null,
        title: data.title ?? null,
        metadata: data.metadata ?? {}
      })
      .returning();
    return this.mapConversation(conv);
  }

  async getConversation(id: string): Promise<Conversation | null> {
    const [conv] = await this.db
      .select()
      .from(schema.conversations)
      .where(eq(schema.conversations.id, id));
    return conv ? this.mapConversation(conv) : null;
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

    const conditions = [];
    if (options?.user_id) conditions.push(eq(schema.conversations.user_id, options.user_id));
    if (options?.workspace_id)
      conditions.push(eq(schema.conversations.workspace_id, options.workspace_id));
    if (!options?.include_archived)
      conditions.push(eq(schema.conversations.is_archived, false));

    const rows = await this.db
      .select()
      .from(schema.conversations)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.conversations.updated_at))
      .limit(limit)
      .offset(offset);

    return rows.map((r) => this.mapConversation(r));
  }

  async updateConversation(
    id: string,
    data: Partial<Pick<Conversation, 'title' | 'is_archived' | 'is_pinned' | 'metadata'>>
  ): Promise<Conversation> {
    const [conv] = await this.db
      .update(schema.conversations)
      .set(data)
      .where(eq(schema.conversations.id, id))
      .returning();
    return this.mapConversation(conv);
  }

  async deleteConversation(id: string): Promise<void> {
    await this.db.delete(schema.conversations).where(eq(schema.conversations.id, id));
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
    const [msg] = await this.db
      .insert(schema.messages)
      .values({
        conversation_id: data.conversation_id,
        role: data.role,
        content: data.content,
        parts: (data.parts as Record<string, unknown>) ?? null,
        model_used: data.model_used ?? null,
        tokens_used: data.tokens_used ?? 0,
        credits_charged: data.credits_charged ?? 0,
        metadata: (data.metadata as Record<string, unknown>) ?? {}
      })
      .returning();
    return this.mapMessage(msg);
  }

  async listMessages(conversation_id: string, options?: PaginationOptions): Promise<Message[]> {
    const limit = options?.limit || 200;
    const offset = options?.offset || 0;
    const rows = await this.db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.conversation_id, conversation_id))
      .orderBy(asc(schema.messages.created_at))
      .limit(limit)
      .offset(offset);
    return rows.map((r) => this.mapMessage(r));
  }

  async deleteMessage(id: string): Promise<void> {
    await this.db.delete(schema.messages).where(eq(schema.messages.id, id));
  }

  // ── Snapshots ─────────────────────────────────────────────────────────

  async createSnapshot(data: {
    conversation_id: string;
    message_id?: string;
    description?: string;
    state: Record<string, unknown>;
  }): Promise<Snapshot> {
    const [snap] = await this.db
      .insert(schema.snapshots)
      .values({
        conversation_id: data.conversation_id,
        message_id: data.message_id ?? null,
        description: data.description ?? null,
        state: data.state
      })
      .returning();
    return this.mapSnapshot(snap);
  }

  async listSnapshots(conversation_id: string): Promise<Snapshot[]> {
    const rows = await this.db
      .select()
      .from(schema.snapshots)
      .where(eq(schema.snapshots.conversation_id, conversation_id))
      .orderBy(desc(schema.snapshots.created_at));
    return rows.map((r) => this.mapSnapshot(r));
  }

  async getSnapshot(id: string): Promise<Snapshot | null> {
    const [snap] = await this.db
      .select()
      .from(schema.snapshots)
      .where(eq(schema.snapshots.id, id));
    return snap ? this.mapSnapshot(snap) : null;
  }

  async deleteSnapshot(id: string): Promise<void> {
    await this.db.delete(schema.snapshots).where(eq(schema.snapshots.id, id));
  }

  // ── Files ─────────────────────────────────────────────────────────────

  async createFileRecord(data: Omit<FileRecord, 'id' | 'created_at'>): Promise<FileRecord> {
    const [file] = await this.db
      .insert(schema.files)
      .values({
        user_id: data.user_id,
        conversation_id: data.conversation_id,
        message_id: data.message_id,
        filename: data.filename,
        original_name: data.original_name,
        mime_type: data.mime_type,
        size_bytes: data.size_bytes,
        storage_path: data.storage_path,
        storage_bucket: data.storage_bucket
      })
      .returning();
    return this.mapFileRecord(file);
  }

  async getFile(id: string): Promise<FileRecord | null> {
    const [file] = await this.db.select().from(schema.files).where(eq(schema.files.id, id));
    return file ? this.mapFileRecord(file) : null;
  }

  async listConversationFiles(conversation_id: string): Promise<FileRecord[]> {
    const rows = await this.db
      .select()
      .from(schema.files)
      .where(eq(schema.files.conversation_id, conversation_id))
      .orderBy(desc(schema.files.created_at));
    return rows.map((r) => this.mapFileRecord(r));
  }

  async deleteFile(id: string): Promise<void> {
    await this.db.delete(schema.files).where(eq(schema.files.id, id));
  }

  // ── Usage Stats ───────────────────────────────────────────────────────

  async createUsageStats(data: Omit<UsageStats, 'id' | 'created_at'>): Promise<UsageStats> {
    const [stats] = await this.db
      .insert(schema.usageStats)
      .values({
        user_id: data.user_id,
        conversation_id: data.conversation_id,
        message_id: data.message_id,
        model: data.model,
        prompt_tokens: data.prompt_tokens,
        completion_tokens: data.completion_tokens,
        total_tokens: data.total_tokens,
        credits_charged: data.credits_charged,
        estimated_cost_usd: String(data.estimated_cost_usd)
      })
      .returning();
    return this.mapUsageStats(stats);
  }

  // ── Cache ─────────────────────────────────────────────────────────────

  async cacheGet(key: string): Promise<CacheEntry | null> {
    const [row] = await this.db
      .select()
      .from(schema.cacheEntries)
      .where(eq(schema.cacheEntries.key, key));
    if (!row) return null;
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      await this.cacheDelete(key);
      return null;
    }
    // Update hit count in background
    this.db
      .update(schema.cacheEntries)
      .set({
        hit_count: (row.hit_count ?? 0) + 1,
        last_accessed_at: new Date()
      })
      .where(eq(schema.cacheEntries.key, key))
      .then(() => {});
    return this.mapCacheEntry(row);
  }

  async cacheSet(
    key: string,
    value: unknown,
    options?: { ttl_seconds?: number; tags?: string[] }
  ): Promise<void> {
    const now = new Date();
    const expiresAt = options?.ttl_seconds
      ? new Date(now.getTime() + options.ttl_seconds * 1000)
      : null;

    await this.db
      .insert(schema.cacheEntries)
      .values({
        key,
        value: value as Record<string, unknown>,
        tags: options?.tags ?? [],
        expires_at: expiresAt,
        hit_count: 0,
        last_accessed_at: now
      })
      .onConflictDoUpdate({
        target: schema.cacheEntries.key,
        set: {
          value: value as Record<string, unknown>,
          tags: options?.tags ?? [],
          expires_at: expiresAt,
          hit_count: 0,
          last_accessed_at: now
        }
      });
  }

  async cacheDelete(key: string): Promise<boolean> {
    const result = await this.db
      .delete(schema.cacheEntries)
      .where(eq(schema.cacheEntries.key, key))
      .returning({ key: schema.cacheEntries.key });
    return result.length > 0;
  }

  async cacheDeleteByTag(tag: string): Promise<number> {
    const result = await this.db
      .delete(schema.cacheEntries)
      .where(sql`${tag} = ANY(${schema.cacheEntries.tags})`)
      .returning({ key: schema.cacheEntries.key });
    return result.length;
  }

  async cacheClear(): Promise<void> {
    await this.db.delete(schema.cacheEntries).where(not(eq(schema.cacheEntries.key, '')));
  }

  async cacheCleanup(): Promise<number> {
    const result = await this.db
      .delete(schema.cacheEntries)
      .where(
        and(
          sql`${schema.cacheEntries.expires_at} IS NOT NULL`,
          sql`${schema.cacheEntries.expires_at} < NOW()`
        )
      )
      .returning({ key: schema.cacheEntries.key });
    return result.length;
  }

  // ── Enabled Models ──────────────────────────────────────────────────

  async listEnabledModels(onlyEnabled = true): Promise<EnabledModel[]> {
    const conditions = onlyEnabled ? eq(schema.enabledModels.is_enabled, true) : undefined;
    const rows = await this.db
      .select()
      .from(schema.enabledModels)
      .where(conditions)
      .orderBy(asc(schema.enabledModels.sort_order));
    return rows.map((r) => this.mapEnabledModel(r));
  }

  async getEnabledModel(model_id: string): Promise<EnabledModel | null> {
    const [row] = await this.db
      .select()
      .from(schema.enabledModels)
      .where(eq(schema.enabledModels.model_id, model_id));
    return row ? this.mapEnabledModel(row) : null;
  }

  async upsertEnabledModel(
    data: Omit<EnabledModel, 'id' | 'created_at' | 'updated_at'>
  ): Promise<EnabledModel> {
    const [row] = await this.db
      .insert(schema.enabledModels)
      .values(data)
      .onConflictDoUpdate({
        target: schema.enabledModels.model_id,
        set: {
          model_name: data.model_name,
          provider: data.provider,
          category: data.category,
          description: data.description,
          is_free: data.is_free,
          gems_per_message: data.gems_per_message,
          max_tokens: data.max_tokens,
          tool_support: data.tool_support,
          is_enabled: data.is_enabled,
          sort_order: data.sort_order,
          metadata: data.metadata
        }
      })
      .returning();
    return this.mapEnabledModel(row);
  }

  async deleteEnabledModel(model_id: string): Promise<void> {
    await this.db
      .delete(schema.enabledModels)
      .where(eq(schema.enabledModels.model_id, model_id));
  }

  // ── App Settings (KV Store) ──────────────────────────────────────────

  async kvGet(user_id: string, category: string, key: string): Promise<unknown | null> {
    const [row] = await this.db
      .select()
      .from(schema.appSettings)
      .where(
        and(
          eq(schema.appSettings.user_id, user_id),
          eq(schema.appSettings.category, category),
          eq(schema.appSettings.key, key)
        )
      );
    if (!row) return null;
    const raw = row.value as Record<string, unknown>;
    if (raw && typeof raw === 'object' && '__kv' in raw) return raw.__kv;
    return raw ?? null;
  }

  async kvSet(user_id: string, category: string, key: string, value: unknown): Promise<void> {
    const jsonbValue =
      value !== null && typeof value === 'object' && !Array.isArray(value)
        ? value
        : { __kv: value };

    await this.db
      .insert(schema.appSettings)
      .values({
        user_id,
        category,
        key,
        value: jsonbValue as Record<string, unknown>
      })
      .onConflictDoUpdate({
        target: [schema.appSettings.user_id, schema.appSettings.category, schema.appSettings.key],
        set: {
          value: jsonbValue as Record<string, unknown>,
          updated_at: new Date()
        }
      });
  }

  async kvDelete(user_id: string, category: string, key: string): Promise<void> {
    await this.db
      .delete(schema.appSettings)
      .where(
        and(
          eq(schema.appSettings.user_id, user_id),
          eq(schema.appSettings.category, category),
          eq(schema.appSettings.key, key)
        )
      );
  }

  async kvGetAll(
    user_id: string,
    category?: string
  ): Promise<{ category: string; key: string; value: unknown }[]> {
    const conditions = [eq(schema.appSettings.user_id, user_id)];
    if (category) conditions.push(eq(schema.appSettings.category, category));

    const rows = await this.db
      .select({ category: schema.appSettings.category, key: schema.appSettings.key, value: schema.appSettings.value })
      .from(schema.appSettings)
      .where(and(...conditions));

    return rows.map((r) => {
      const raw = r.value as Record<string, unknown>;
      const unwrapped = raw && typeof raw === 'object' && '__kv' in raw ? raw.__kv : raw;
      return { category: r.category, key: r.key, value: unwrapped };
    });
  }

  async kvSetBatch(
    user_id: string,
    entries: { category: string; key: string; value: unknown }[]
  ): Promise<void> {
    if (entries.length === 0) return;
    const validEntries = entries.filter((e) => e.value !== undefined);
    if (validEntries.length === 0) return;

    for (const e of validEntries) {
      await this.kvSet(user_id, e.category, e.key, e.value);
    }
  }

  // ── File Versions ────────────────────────────────────────────────────

  async createFileVersion(data: {
    file_id: string;
    user_id: string;
    version: number;
    content_mermaid: string;
    content_document: string;
  }): Promise<{ id: string; version: number; created_at: string }> {
    const [row] = await this.db
      .insert(schema.fileVersions)
      .values({
        file_id: data.file_id,
        user_id: data.user_id,
        version: data.version,
        content_mermaid: data.content_mermaid,
        content_document: data.content_document
      })
      .returning({
        id: schema.fileVersions.id,
        version: schema.fileVersions.version,
        created_at: schema.fileVersions.created_at
      });
    return {
      id: row.id,
      version: row.version,
      created_at: row.created_at.toISOString()
    };
  }

  async listFileVersions(
    file_id: string,
    limit?: number
  ): Promise<
    Array<{
      id: string;
      file_id: string;
      version: number;
      content_mermaid: string;
      content_document: string;
      created_at: string;
    }>
  > {
    const query = this.db
      .select()
      .from(schema.fileVersions)
      .where(eq(schema.fileVersions.file_id, file_id))
      .orderBy(desc(schema.fileVersions.version));

    const rows = limit ? await query.limit(limit) : await query;

    return rows.map((r) => ({
      id: r.id,
      file_id: r.file_id,
      version: r.version,
      content_mermaid: r.content_mermaid,
      content_document: r.content_document,
      created_at: r.created_at.toISOString()
    }));
  }

  async pruneFileVersions(file_id: string, keepCount: number): Promise<number> {
    // Get IDs of versions to keep (top N by version DESC)
    const keep = await this.db
      .select({ id: schema.fileVersions.id })
      .from(schema.fileVersions)
      .where(eq(schema.fileVersions.file_id, file_id))
      .orderBy(desc(schema.fileVersions.version))
      .limit(keepCount);

    const keepIds = keep.map((r) => r.id);

    if (keepIds.length === 0) return 0;

    const deleted = await this.db
      .delete(schema.fileVersions)
      .where(
        and(
          eq(schema.fileVersions.file_id, file_id),
          not(inArray(schema.fileVersions.id, keepIds))
        )
      )
      .returning({ id: schema.fileVersions.id });

    return deleted.length;
  }

  // ── Health ────────────────────────────────────────────────────────────

  async healthCheck(): Promise<boolean> {
    try {
      await this.db.execute(sql`SELECT 1`);
      return true;
    } catch {
      return false;
    }
  }

  // ── Row Mappers (Drizzle row → interface types) ───────────────────────

  private mapUser(row: typeof schema.users.$inferSelect): User {
    return {
      id: row.id,
      firebase_uid: row.firebase_uid,
      email: row.email,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      role: row.role as User['role'],
      is_active: row.is_active,
      email_verified: row.email_verified,
      last_login_at: row.last_login_at?.toISOString() ?? null,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString()
    };
  }

  private mapSession(row: typeof schema.sessions.$inferSelect): Session {
    return {
      id: row.id,
      user_id: row.user_id,
      token: row.token,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      expires_at: row.expires_at.toISOString(),
      created_at: row.created_at.toISOString()
    };
  }

  private mapWorkspace(row: typeof schema.workspaces.$inferSelect): Workspace {
    return {
      id: row.id,
      owner_id: row.owner_id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      is_public: row.is_public,
      settings: (row.settings as Record<string, unknown>) ?? {},
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString()
    };
  }

  private mapCollabMember(
    row: typeof schema.collaborationMembers.$inferSelect
  ): CollaborationMember {
    return {
      id: row.id,
      workspace_id: row.workspace_id,
      user_id: row.user_id,
      role: row.role as CollaborationMember['role'],
      invited_by: row.invited_by,
      joined_at: row.joined_at.toISOString()
    };
  }

  private mapCreditBalance(row: typeof schema.creditBalances.$inferSelect): CreditBalance {
    return {
      id: row.id,
      user_id: row.user_id,
      balance: row.balance,
      lifetime_earned: row.lifetime_earned,
      lifetime_spent: row.lifetime_spent,
      updated_at: row.updated_at.toISOString()
    };
  }

  private mapCreditTransaction(
    row: typeof schema.creditTransactions.$inferSelect
  ): CreditTransaction {
    return {
      id: row.id,
      user_id: row.user_id,
      amount: row.amount,
      balance_after: row.balance_after,
      type: row.type as CreditTransaction['type'],
      description: row.description,
      model_id: row.model_id,
      conversation_id: row.conversation_id,
      message_id: row.message_id,
      created_at: row.created_at.toISOString()
    };
  }

  private mapModelPricing(row: typeof schema.modelPricing.$inferSelect): ModelPricing {
    return {
      id: row.id,
      model_id: row.model_id,
      model_name: row.model_name,
      provider: row.provider,
      credits_per_request: row.credits_per_request,
      credits_per_1k_input_tokens: Number(row.credits_per_1k_input_tokens),
      credits_per_1k_output_tokens: Number(row.credits_per_1k_output_tokens),
      is_free: row.is_free,
      is_active: row.is_active,
      metadata: (row.metadata as Record<string, unknown>) ?? {}
    };
  }

  private mapConversation(row: typeof schema.conversations.$inferSelect): Conversation {
    return {
      id: row.id,
      user_id: row.user_id,
      workspace_id: row.workspace_id,
      title: row.title,
      is_archived: row.is_archived,
      is_pinned: row.is_pinned,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString()
    };
  }

  private mapMessage(row: typeof schema.messages.$inferSelect): Message {
    return {
      id: row.id,
      conversation_id: row.conversation_id,
      role: row.role as Message['role'],
      content: row.content,
      parts: row.parts,
      model_used: row.model_used,
      tokens_used: row.tokens_used ?? 0,
      credits_charged: row.credits_charged ?? 0,
      metadata: (row.metadata as Record<string, unknown>) ?? null,
      created_at: row.created_at.toISOString()
    };
  }

  private mapSnapshot(row: typeof schema.snapshots.$inferSelect): Snapshot {
    return {
      id: row.id,
      conversation_id: row.conversation_id,
      message_id: row.message_id,
      description: row.description,
      state: (row.state as Record<string, unknown>) ?? {},
      created_at: row.created_at.toISOString()
    };
  }

  private mapFileRecord(row: typeof schema.files.$inferSelect): FileRecord {
    return {
      id: row.id,
      user_id: row.user_id,
      conversation_id: row.conversation_id,
      message_id: row.message_id,
      filename: row.filename,
      original_name: row.original_name,
      mime_type: row.mime_type,
      size_bytes: row.size_bytes,
      storage_path: row.storage_path,
      storage_bucket: row.storage_bucket ?? 'uploads',
      created_at: row.created_at.toISOString()
    };
  }

  private mapUsageStats(row: typeof schema.usageStats.$inferSelect): UsageStats {
    return {
      id: row.id,
      user_id: row.user_id,
      conversation_id: row.conversation_id,
      message_id: row.message_id,
      model: row.model,
      prompt_tokens: row.prompt_tokens ?? 0,
      completion_tokens: row.completion_tokens ?? 0,
      total_tokens: row.total_tokens ?? 0,
      credits_charged: row.credits_charged ?? 0,
      estimated_cost_usd: Number(row.estimated_cost_usd),
      created_at: row.created_at.toISOString()
    };
  }

  private mapCacheEntry(row: typeof schema.cacheEntries.$inferSelect): CacheEntry {
    return {
      key: row.key,
      value: row.value,
      tags: (row.tags as string[]) ?? [],
      hit_count: row.hit_count ?? 0,
      expires_at: row.expires_at?.toISOString() ?? null,
      created_at: row.created_at.toISOString(),
      last_accessed_at: row.last_accessed_at.toISOString()
    };
  }

  private mapEnabledModel(row: typeof schema.enabledModels.$inferSelect): EnabledModel {
    return {
      id: row.id,
      model_id: row.model_id,
      model_name: row.model_name,
      provider: row.provider,
      category: row.category,
      description: row.description,
      is_free: row.is_free,
      gems_per_message: row.gems_per_message,
      max_tokens: row.max_tokens ?? 4000,
      tool_support: row.tool_support,
      is_enabled: row.is_enabled,
      sort_order: row.sort_order ?? 0,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString()
    };
  }
}
