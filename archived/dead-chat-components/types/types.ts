/**
 * Shared type definitions for chat functionality
 */

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface MessagePart {
  type: 'text' | 'tool-call' | 'tool-result';
  text?: string;
  toolName?: string;
  toolCallId?: string;
  result?: unknown;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  parts?: MessagePart[];
  createdAt?: string;
  metadata?: Record<string, unknown>;
}

export interface Conversation {
  id: string;
  userId?: string | null;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface StreamEvent {
  type: 'text' | 'tool_call' | 'diagram' | 'questionnaire' | 'error' | 'done';
  content?: string;
  data?: Record<string, unknown>;
}

export interface DiagramData {
  type: string;
  title: string;
  code: string;
  explanation?: string;
}

export interface QuestionnaireData {
  intro: string;
  questions: Array<{
    id: string;
    question: string;
    options: Array<{
      id: string;
      label: string;
      description?: string;
    }>;
  }>;
}

export type ChatStatus = 'idle' | 'loading' | 'streaming' | 'error';

export interface ChatState {
  messages: ChatMessage[];
  status: ChatStatus;
  error: string | null;
  conversationId: string | null;
}
