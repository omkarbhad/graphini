// Message type definitions for chat components

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  reasoning?: string;
  toolCalls?: ToolCall[];
  attachments?: Attachment[];
  metadata?: MessageMetadata;
}

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  result?: any;
  status: 'pending' | 'completed' | 'error';
  error?: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  content?: string;
}

export interface MessageMetadata {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latency?: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  settings?: ConversationSettings;
}

export interface ConversationSettings {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
}

export interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  error: string | null;
  activeConversation: string | null;
  conversations: Conversation[];
  settings: ConversationSettings;
}

export interface ChatContext {
  sendMessage: (message: string, attachments?: Attachment[]) => Promise<void>;
  retryMessage: (messageId: string) => Promise<void>;
  deleteMessage: (messageId: string) => void;
  clearChat: () => void;
  loadConversation: (conversationId: string) => void;
  createConversation: () => void;
  deleteConversation: (conversationId: string) => void;
  updateSettings: (settings: Partial<ConversationSettings>) => void;
}

// Event types for streaming
export interface ChatEvent {
  type: ChatEventType;
  data: any;
}

export type ChatEventType =
  | 'message_start'
  | 'message_delta'
  | 'message_complete'
  | 'reasoning_start'
  | 'reasoning_delta'
  | 'reasoning_complete'
  | 'tool_call_start'
  | 'tool_call_delta'
  | 'tool_call_complete'
  | 'error'
  | 'done';

// Questionnaire types
export interface Questionnaire {
  id: string;
  title: string;
  description?: string;
  context?: string;
  questions: Question[];
  metadata?: Record<string, any>;
}

export interface Question {
  id: string;
  type: 'text' | 'select' | 'multiselect' | 'boolean';
  question: string;
  description?: string;
  required?: boolean;
  options?: string[];
  validation?: QuestionValidation;
}

export interface QuestionValidation {
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
}

export interface QuestionnaireResponse {
  questionnaireId: string;
  responses: Record<string, any>;
  timestamp: Date;
}
