import Dexie, { type Table } from 'dexie';

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool' | string;

export interface ConversationRecord {
  id: string;
  title?: string;
  createdAt: number;
  updatedAt: number;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  parts?: unknown;
  createdAt: number;
  metadata?: Record<string, unknown> | null;
}

export interface SnapshotRecord {
  id: string;
  conversationId: string;
  messageId: string;
  description?: string;
  state: string;
  createdAt: number;
}

export interface ContextRecord {
  id: string;
  conversationId?: string | null;
  label: string;
  payload: string;
  createdAt: number;
  updatedAt: number;
  scope: 'global' | 'conversation';
}

export interface EmbeddingRecord {
  id: string;
  messageId?: string | null;
  contextId?: string | null;
  vector: Float32Array;
  createdAt: number;
  metadata?: Record<string, unknown> | null;
}

class MermaidChatDatabase extends Dexie {
  conversations!: Table<ConversationRecord>;
  messages!: Table<MessageRecord>;
  snapshots!: Table<SnapshotRecord>;
  contexts!: Table<ContextRecord>;
  embeddings!: Table<EmbeddingRecord>;

  constructor() {
    super('mermaid-chat');

    this.version(1).stores({
      contexts: '&id, conversationId, scope, updatedAt',
      conversations: '&id, updatedAt',
      embeddings: '&id, messageId, contextId, createdAt',
      messages: '&id, conversationId, createdAt',
      snapshots: '&id, conversationId, messageId, createdAt'
    });

    this.conversations = this.table('conversations');
    this.messages = this.table('messages');
    this.snapshots = this.table('snapshots');
    this.contexts = this.table('contexts');
    this.embeddings = this.table('embeddings');
  }
}

export const chatDB = new MermaidChatDatabase();

export async function ensureConversation(conversationId?: string): Promise<ConversationRecord> {
  const now = Date.now();

  if (conversationId) {
    const existing = await chatDB.conversations.get(conversationId);
    if (existing) {
      await chatDB.conversations.update(conversationId, { updatedAt: now });
      return { ...existing, updatedAt: now };
    }
  }

  const id = crypto.randomUUID();
  const record: ConversationRecord = { id, createdAt: now, updatedAt: now };
  await chatDB.conversations.put(record);
  return record;
}

export async function addMessage(record: MessageRecord): Promise<void> {
  await chatDB.messages.put(record);
  await chatDB.conversations.update(record.conversationId, { updatedAt: Date.now() });
}

export async function addSnapshot(record: SnapshotRecord): Promise<void> {
  await chatDB.snapshots.put(record);
}

export async function reassignSnapshotMessageId(
  conversationId: string,
  oldMessageId: string,
  newMessageId: string
): Promise<number> {
  return chatDB.snapshots
    .where({ conversationId, messageId: oldMessageId })
    .modify({ messageId: newMessageId });
}

export async function deleteSnapshotsByMessageId(
  conversationId: string,
  messageId: string
): Promise<void> {
  await chatDB.snapshots.where({ conversationId, messageId }).delete();
}

export async function upsertContext(record: ContextRecord): Promise<void> {
  const timestamps = { createdAt: Date.now(), updatedAt: Date.now() };
  const existing = await chatDB.contexts.get(record.id);
  if (existing) {
    await chatDB.contexts.put({ ...existing, ...record, updatedAt: timestamps.updatedAt });
  } else {
    await chatDB.contexts.put({ ...record, ...timestamps });
  }
}

export async function addEmbedding(record: EmbeddingRecord): Promise<void> {
  await chatDB.embeddings.put(record);
}

export async function listConversationMessages(conversationId: string): Promise<MessageRecord[]> {
  return chatDB.messages.where({ conversationId }).sortBy('createdAt');
}

export async function findSnapshots(conversationId: string): Promise<SnapshotRecord[]> {
  return chatDB.snapshots.where({ conversationId }).sortBy('createdAt');
}

export async function listContexts(conversationId?: string): Promise<ContextRecord[]> {
  if (!conversationId) {
    return chatDB.contexts.where({ scope: 'global' }).sortBy('updatedAt');
  }

  const [globalContexts, conversationContexts] = await Promise.all([
    chatDB.contexts.where({ scope: 'global' }).toArray(),
    chatDB.contexts.where({ conversationId }).toArray()
  ]);

  return [...globalContexts, ...conversationContexts].sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteSnapshot(snapshotId: string): Promise<void> {
  await chatDB.snapshots.delete(snapshotId);
}

export async function deleteConversation(conversationId: string): Promise<void> {
  await Dexie.waitFor(
    Promise.all([
      chatDB.conversations.delete(conversationId),
      chatDB.messages.where({ conversationId }).delete(),
      chatDB.snapshots.where({ conversationId }).delete(),
      chatDB.embeddings.where({ conversationId }).delete()
    ])
  );
}
