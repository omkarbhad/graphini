import type { UIMessage } from 'ai';
import {
  addMessage,
  addSnapshot,
  ensureConversation,
  listConversationMessages,
  findSnapshots,
  reassignSnapshotMessageId,
  type ConversationRecord,
  type MessageRecord,
  type SnapshotRecord
} from './db';
import { embedAndStoreMessage } from './vector-store';
import { getStateString } from '$lib/util/state';

export interface ChatRepository {
  conversationId: string;
  loadMessages(): Promise<UIMessage[]>;
  saveMessage(message: UIMessage): Promise<void>;
  saveSnapshot(messageId: string, description?: string): Promise<void>;
  listSnapshots(): Promise<SnapshotRecord[]>;
}

export async function createChatRepository(conversationId?: string): Promise<ChatRepository> {
  const conversation: ConversationRecord = await ensureConversation(conversationId);

  return {
    conversationId: conversation.id,

    async listSnapshots(): Promise<SnapshotRecord[]> {
      return findSnapshots(conversation.id);
    },

    async loadMessages(): Promise<UIMessage[]> {
      const records = await listConversationMessages(conversation.id);
      return records.map(messageRecordToUIMessage);
    },

    async saveMessage(message: UIMessage): Promise<void> {
      // Extract text content from parts
      const sanitizedParts = sanitizeMessageParts(message.parts);

      const textContent =
        sanitizedParts
          ?.filter((part: any) => part.type === 'text' && typeof part.text === 'string')
          .map((part: any) => part.text as string)
          .join('\n\n') || '';

      const recordId = message.id ?? crypto.randomUUID();
      const record: MessageRecord = {
        content: textContent,
        conversationId: conversation.id,
        createdAt: Date.now(),
        id: recordId,
        metadata: null,
        parts: sanitizedParts,
        role: message.role
      };

      await addMessage(record);

      // If Dexie generated a different ID than snapshot mapping, update snapshots to match
      if (message.id && message.id !== recordId) {
        void reassignSnapshotMessageId(conversation.id, message.id, recordId).catch((error) => {
          console.error('Failed to reassign snapshot messageId:', error);
        });
      }

      // Generate embeddings for user messages asynchronously
      if (message.role === 'user' && record.content) {
        void embedAndStoreMessage(record.id, record.content).catch((err) => {
          console.error('Failed to generate embedding for message:', err);
        });
      }
    },

    async saveSnapshot(messageId: string, description?: string): Promise<void> {
      const state = getStateString();
      const snapshot: SnapshotRecord = {
        conversationId: conversation.id,
        createdAt: Date.now(),
        description,
        id: crypto.randomUUID(),
        messageId,
        state
      };
      await addSnapshot(snapshot);
    }
  };
}

function messageRecordToUIMessage(record: MessageRecord): UIMessage {
  return {
    id: record.id,
    role: record.role as 'user' | 'assistant' | 'system',
    parts: record.parts as any
  };
}

function sanitizeMessageParts(parts?: UIMessage['parts']): any[] | undefined {
  if (!parts) return undefined;

  const safeClone = <T>(value: T): T | null => {
    if (value === undefined) return null;
    try {
      return JSON.parse(JSON.stringify(value)) as T;
    } catch (error) {
      console.error('Failed to sanitize message part content:', error);
      return null;
    }
  };

  const sanitized = [] as any[];
  for (const part of parts) {
    if (!part || typeof part !== 'object') {
      continue;
    }

    const type = (part as any).type;

    switch (type) {
      case 'text': {
        sanitized.push({ type: 'text', text: (part as any).text ?? '' });
        break;
      }
      case 'file': {
        sanitized.push({
          type: 'file',
          url: (part as any).url ?? null,
          mediaType: (part as any).mediaType ?? null,
          filename: (part as any).filename ?? null
        });
        break;
      }
      case 'reasoning': {
        sanitized.push({ type: 'reasoning', text: (part as any).text ?? '' });
        break;
      }
      case 'data': {
        sanitized.push({ type: 'data', data: safeClone((part as any).data) });
        break;
      }
      case 'tool-call': {
        sanitized.push({
          type: 'tool-call',
          name: (part as any).name ?? null,
          arguments: safeClone((part as any).arguments)
        });
        break;
      }
      case 'tool-result': {
        sanitized.push({
          type: 'tool-result',
          name: (part as any).name ?? null,
          result: safeClone((part as any).result)
        });
        break;
      }
      default: {
        const cloned = safeClone(part);
        if (cloned) {
          sanitized.push(cloned);
        } else {
          sanitized.push({ type: String(type ?? 'unknown'), value: null });
        }
        break;
      }
    }
  }

  return sanitized;
}
