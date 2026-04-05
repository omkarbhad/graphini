// Constants for chat components

export const CHAT_CONSTANTS = {
  // Message limits
  MAX_MESSAGE_LENGTH: 32000,
  MAX_ATTACHMENT_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_ATTACHMENTS_PER_MESSAGE: 5,

  // UI constants
  MESSAGE_ANIMATION_DURATION: 300,
  TYPING_INDICATOR_DELAY: 1000,
  AUTO_SCROLL_THRESHOLD: 100,

  // Storage
  CONVERSATION_TITLE_LENGTH: 50,
  MESSAGE_PREVIEW_LENGTH: 100,
  MAX_CONVERSATIONS_IN_LIST: 50,

  // API
  DEFAULT_MODEL: 'gpt-4',
  DEFAULT_TEMPERATURE: 0.7,
  DEFAULT_MAX_TOKENS: 2048,
  REQUEST_TIMEOUT: 30000,

  // Streaming
  STREAM_CHUNK_SIZE: 1024,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,

  // Sync
  SYNC_DEBOUNCE_DELAY: 1000,
  SYNC_INTERVAL: 120000, // 2 minutes

  // Questionnaire
  QUESTIONNAIRE_TIMEOUT: 300000, // 5 minutes
  MAX_QUESTIONS_PER_QUESTIONNAIRE: 20
} as const;

export const MESSAGE_ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
  TOOL: 'tool'
} as const;

export const TOOL_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  ERROR: 'error'
} as const;

export const CHAT_EVENT_TYPES = {
  MESSAGE_START: 'message_start',
  MESSAGE_DELTA: 'message_delta',
  MESSAGE_COMPLETE: 'message_complete',
  REASONING_START: 'reasoning_start',
  REASONING_DELTA: 'reasoning_delta',
  REASONING_COMPLETE: 'reasoning_complete',
  TOOL_CALL_START: 'tool_call_start',
  TOOL_CALL_DELTA: 'tool_call_delta',
  TOOL_CALL_COMPLETE: 'tool_call_complete',
  ERROR: 'error',
  DONE: 'done'
} as const;

export const QUESTION_TYPES = {
  TEXT: 'text',
  SELECT: 'select',
  MULTISELECT: 'multiselect',
  BOOLEAN: 'boolean'
} as const;

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error occurred. Please check your connection.',
  API_ERROR: 'API error occurred. Please try again.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  VALIDATION_ERROR: 'Invalid input. Please check your message.',
  ATTACHMENT_ERROR: 'Attachment upload failed. Please try again.',
  QUESTIONNAIRE_ERROR: 'Questionnaire error. Please try again.',
  UNKNOWN_ERROR: 'An unknown error occurred. Please try again.'
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  MESSAGE_SENT: 'Message sent successfully.',
  ATTACHMENT_UPLOADED: 'Attachment uploaded successfully.',
  QUESTIONNAIRE_SUBMITTED: 'Questionnaire submitted successfully.',
  CONVERSATION_SAVED: 'Conversation saved successfully.',
  CONVERSATION_DELETED: 'Conversation deleted successfully.'
} as const;

// Default settings
export const DEFAULT_SETTINGS = {
  model: CHAT_CONSTANTS.DEFAULT_MODEL,
  temperature: CHAT_CONSTANTS.DEFAULT_TEMPERATURE,
  maxTokens: CHAT_CONSTANTS.DEFAULT_MAX_TOKENS,
  systemPrompt: '',
  autoSync: true,
  showReasoning: true,
  enableAttachments: true,
  enableQuestionnaires: true
} as const;
