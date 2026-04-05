/**
 * Drizzle ORM Schema — mirrors database/v2-schema.sql
 */

import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  bigint,
  numeric,
  jsonb,
  timestamp,
  uniqueIndex,
  index
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ── Users & Auth ───────────────────────────────────────────────────────────

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firebase_uid: text('firebase_uid').unique(),
    email: text('email').unique().notNull(),
    password_hash: text('password_hash'),
    display_name: text('display_name'),
    avatar_url: text('avatar_url'),
    role: text('role', { enum: ['user', 'admin', 'superadmin'] })
      .notNull()
      .default('user'),
    is_active: boolean('is_active').notNull().default(true),
    email_verified: boolean('email_verified').notNull().default(false),
    last_login_at: timestamp('last_login_at', { withTimezone: true }),
    metadata: jsonb('metadata').default({}),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [index('idx_users_email').on(t.email), index('idx_users_role').on(t.role), index('idx_users_firebase_uid').on(t.firebase_uid)]
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').unique().notNull(),
    ip_address: text('ip_address'),
    user_agent: text('user_agent'),
    expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    index('idx_sessions_user').on(t.user_id),
    index('idx_sessions_token').on(t.token),
    index('idx_sessions_expires').on(t.expires_at)
  ]
);

// ── Workspaces & Collaboration ─────────────────────────────────────────────

export const workspaces = pgTable(
  'workspaces',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    owner_id: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').unique().notNull(),
    description: text('description'),
    is_public: boolean('is_public').notNull().default(false),
    settings: jsonb('settings').default({}),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [index('idx_workspaces_owner').on(t.owner_id), index('idx_workspaces_slug').on(t.slug)]
);

export const collaborationMembers = pgTable(
  'collaboration_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspace_id: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['viewer', 'editor', 'admin', 'owner'] })
      .notNull()
      .default('viewer'),
    invited_by: uuid('invited_by').references(() => users.id),
    joined_at: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    uniqueIndex('collaboration_members_workspace_id_user_id_key').on(t.workspace_id, t.user_id),
    index('idx_collab_workspace').on(t.workspace_id),
    index('idx_collab_user').on(t.user_id)
  ]
);

// ── Credits & Billing ──────────────────────────────────────────────────────

export const creditBalances = pgTable('credit_balances', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .unique()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  balance: integer('balance').notNull().default(100),
  lifetime_earned: integer('lifetime_earned').notNull().default(100),
  lifetime_spent: integer('lifetime_spent').notNull().default(0),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const modelPricing = pgTable('model_pricing', {
  id: uuid('id').primaryKey().defaultRandom(),
  model_id: text('model_id').unique().notNull(),
  model_name: text('model_name').notNull(),
  provider: text('provider').notNull(),
  credits_per_request: integer('credits_per_request').notNull().default(1),
  credits_per_1k_input_tokens: numeric('credits_per_1k_input_tokens', {
    precision: 10,
    scale: 4
  }).default('0'),
  credits_per_1k_output_tokens: numeric('credits_per_1k_output_tokens', {
    precision: 10,
    scale: 4
  }).default('0'),
  is_free: boolean('is_free').notNull().default(false),
  is_active: boolean('is_active').notNull().default(true),
  metadata: jsonb('metadata').default({}),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const creditTransactions = pgTable(
  'credit_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(),
    balance_after: integer('balance_after').notNull(),
    type: text('type', {
      enum: ['purchase', 'usage', 'refund', 'bonus', 'signup', 'referral']
    }).notNull(),
    description: text('description'),
    model_id: text('model_id'),
    conversation_id: uuid('conversation_id'),
    message_id: uuid('message_id'),
    metadata: jsonb('metadata').default({}),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    index('idx_credit_tx_user').on(t.user_id, t.created_at),
    index('idx_credit_tx_type').on(t.type)
  ]
);

// ── Conversations & Messages ───────────────────────────────────────────────

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    workspace_id: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
    title: text('title'),
    is_archived: boolean('is_archived').notNull().default(false),
    is_pinned: boolean('is_pinned').notNull().default(false),
    metadata: jsonb('metadata').default({}),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    index('idx_conversations_user').on(t.user_id, t.updated_at),
    index('idx_conversations_workspace').on(t.workspace_id),
    index('idx_conversations_updated').on(t.updated_at)
  ]
);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversation_id: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['user', 'assistant', 'system', 'tool'] }).notNull(),
    content: text('content').notNull(),
    parts: jsonb('parts'),
    model_used: text('model_used'),
    tokens_used: integer('tokens_used').default(0),
    credits_charged: integer('credits_charged').default(0),
    metadata: jsonb('metadata').default({}),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    index('idx_messages_conversation').on(t.conversation_id, t.created_at),
    index('idx_messages_role').on(t.conversation_id, t.role)
  ]
);

export const snapshots = pgTable(
  'snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversation_id: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    message_id: uuid('message_id').references(() => messages.id, { onDelete: 'cascade' }),
    description: text('description'),
    state: jsonb('state').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [index('idx_snapshots_conversation').on(t.conversation_id, t.created_at)]
);

// ── Files ──────────────────────────────────────────────────────────────────

export const files = pgTable(
  'files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    conversation_id: uuid('conversation_id').references(() => conversations.id, {
      onDelete: 'cascade'
    }),
    message_id: uuid('message_id').references(() => messages.id, { onDelete: 'set null' }),
    filename: text('filename').notNull(),
    original_name: text('original_name').notNull(),
    mime_type: text('mime_type').notNull(),
    size_bytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    storage_path: text('storage_path').notNull(),
    storage_bucket: text('storage_bucket').default('uploads'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [index('idx_files_user').on(t.user_id), index('idx_files_conversation').on(t.conversation_id)]
);

// ── Usage Stats ────────────────────────────────────────────────────────────

export const usageStats = pgTable(
  'usage_stats',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    conversation_id: uuid('conversation_id').references(() => conversations.id, {
      onDelete: 'cascade'
    }),
    message_id: uuid('message_id').references(() => messages.id, { onDelete: 'cascade' }),
    model: text('model').notNull(),
    prompt_tokens: integer('prompt_tokens').default(0),
    completion_tokens: integer('completion_tokens').default(0),
    total_tokens: integer('total_tokens').default(0),
    credits_charged: integer('credits_charged').default(0),
    estimated_cost_usd: numeric('estimated_cost_usd', { precision: 10, scale: 6 }).default('0'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    index('idx_usage_user').on(t.user_id, t.created_at),
    index('idx_usage_conversation').on(t.conversation_id)
  ]
);

// ── Cache ──────────────────────────────────────────────────────────────────

export const cacheEntries = pgTable(
  'cache_entries',
  {
    key: text('key').primaryKey(),
    value: jsonb('value').notNull(),
    tags: text('tags').array().default(sql`'{}'`),
    hit_count: integer('hit_count').default(0),
    expires_at: timestamp('expires_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    last_accessed_at: timestamp('last_accessed_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [index('idx_cache_expires').on(t.expires_at)]
);

// ── App Settings (KV Store) ────────────────────────────────────────────────

export const appSettings = pgTable(
  'app_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    category: text('category').notNull(),
    key: text('key').notNull(),
    value: jsonb('value').notNull(),
    description: text('description'),
    is_sensitive: boolean('is_sensitive').default(false),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    uniqueIndex('app_settings_user_id_category_key_key').on(t.user_id, t.category, t.key),
    index('idx_settings_user').on(t.user_id, t.category)
  ]
);

// ── App States ─────────────────────────────────────────────────────────────

export const appStates = pgTable(
  'app_states',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    session_id: uuid('session_id').references(() => sessions.id, { onDelete: 'set null' }),
    state_type: text('state_type', {
      enum: ['ui', 'chat', 'editor', 'streaming', 'error', 'debug', 'analytics']
    }).notNull(),
    state_data: jsonb('state_data').notNull().default({}),
    metadata: jsonb('metadata').default({}),
    expires_at: timestamp('expires_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    index('idx_states_user').on(t.user_id),
    index('idx_states_type').on(t.state_type),
    index('idx_states_session').on(t.session_id)
  ]
);

// ── Analytics & Audit ──────────────────────────────────────────────────────

export const analyticsEvents = pgTable(
  'analytics_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    event_type: text('event_type').notNull(),
    user_id: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    session_id: uuid('session_id'),
    conversation_id: uuid('conversation_id'),
    event_data: jsonb('event_data').default({}),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    index('idx_analytics_type').on(t.event_type, t.created_at),
    index('idx_analytics_user').on(t.user_id)
  ]
);

export const adminAuditLog = pgTable('admin_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  admin_user_id: uuid('admin_user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  resource_type: text('resource_type').notNull(),
  resource_id: text('resource_id'),
  old_value: jsonb('old_value'),
  new_value: jsonb('new_value'),
  ip_address: text('ip_address'),
  user_agent: text('user_agent'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// ── Enabled Models ─────────────────────────────────────────────────────────

export const enabledModels = pgTable(
  'enabled_models',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    model_id: text('model_id').unique().notNull(),
    model_name: text('model_name').notNull(),
    provider: text('provider').notNull().default('openrouter'),
    category: text('category').notNull().default('General'),
    description: text('description'),
    is_free: boolean('is_free').notNull().default(false),
    gems_per_message: integer('gems_per_message').notNull().default(2),
    max_tokens: integer('max_tokens').default(4000),
    tool_support: boolean('tool_support').notNull().default(false),
    is_enabled: boolean('is_enabled').notNull().default(true),
    sort_order: integer('sort_order').default(0),
    metadata: jsonb('metadata').default({}),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    index('idx_enabled_models_provider').on(t.provider),
    index('idx_enabled_models_enabled').on(t.is_enabled),
    index('idx_enabled_models_free').on(t.is_free)
  ]
);

// ── Diagram Workspaces ────────────────────────────────────────────────────

export const diagramWorkspaces = pgTable(
  'diagram_workspaces',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default('Untitled Workspace'),
    description: text('description'),
    diagram_type: text('diagram_type'),
    is_starred: boolean('is_starred').notNull().default(false),
    tags: text('tags').array().default(sql`'{}'`),
    document: jsonb('document').notNull().default({}),
    element_count: integer('element_count').notNull().default(0),
    thumbnail_url: text('thumbnail_url'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    index('idx_diagram_workspaces_user').on(t.user_id, t.updated_at),
    index('idx_diagram_workspaces_starred').on(t.user_id, t.is_starred)
  ]
);

// ── File Versions ─────────────────────────────────────────────────────────

export const fileVersions = pgTable(
  'file_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    file_id: text('file_id').notNull(),
    user_id: text('user_id').notNull(),
    version: integer('version').notNull(),
    content_mermaid: text('content_mermaid').notNull().default(''),
    content_document: text('content_document').notNull().default(''),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [index('idx_file_versions_file').on(t.file_id, t.version)]
);
