/**
 * Chat service types
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  parts?: MessagePart[];
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export interface MessagePart {
  type: 'text' | 'tool' | 'file' | 'reasoning';
  text?: string;
  toolName?: string;
  toolCallId?: string;
  args?: any;
  result?: any;
  state?: string;
}

export interface StreamEvent {
  type: string;
  content?: string;
  data?: Record<string, any>;
  error?: string;
  [key: string]: any;
}

export interface DiagramData {
  type: string;
  title?: string;
  code: string;
  explanation?: string;
}

export interface ConversationData {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}
