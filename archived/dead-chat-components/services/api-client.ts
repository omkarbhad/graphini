/**
 * Chat API Client with retry logic and error handling
 */

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2
};

export class ChatAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public retryAfter?: number,
    public isRetryable = false
  ) {
    super(message);
    this.name = 'ChatAPIError';
  }
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof ChatAPIError) {
    return error.isRetryable;
  }

  // Network errors are retryable
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: unknown;
  let delay = config.initialDelayMs;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if not retryable or if this was the last attempt
      if (!isRetryableError(error) || attempt === config.maxRetries) {
        throw error;
      }

      // If rate limited, use the retry-after value
      if (error instanceof ChatAPIError && error.retryAfter) {
        delay = error.retryAfter * 1000;
      }

      console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, error);
      await sleep(delay);

      // Exponential backoff
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
    }
  }

  throw lastError;
}

async function handleResponse(response: Response): Promise<Response> {
  // Handle rate limiting
  if (response.status === 429) {
    const data = await response.json();
    const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
    throw new ChatAPIError(
      data.message || 'Rate limit exceeded',
      429,
      retryAfter,
      true // Rate limit errors are retryable
    );
  }

  // Handle validation errors (not retryable)
  if (response.status === 400) {
    const data = await response.json();
    throw new ChatAPIError(data.message || 'Invalid request', 400, undefined, false);
  }

  // Handle not found (not retryable)
  if (response.status === 404) {
    const data = await response.json();
    throw new ChatAPIError(data.message || 'Not found', 404, undefined, false);
  }

  // Handle service unavailable (retryable)
  if (response.status === 503) {
    const data = await response.json();
    throw new ChatAPIError(data.message || 'Service temporarily unavailable', 503, undefined, true);
  }

  // Handle server errors (retryable)
  if (response.status >= 500) {
    const data = await response.json().catch(() => ({ message: 'Server error' }));
    throw new ChatAPIError(
      data.message || 'Internal server error',
      response.status,
      undefined,
      true
    );
  }

  // Handle other errors (not retryable)
  if (!response.ok) {
    const data = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ChatAPIError(
      data.message || `Request failed with status ${response.status}`,
      response.status,
      undefined,
      false
    );
  }

  return response;
}

// ============================================================================
// CONVERSATION API
// ============================================================================

export async function listConversations(
  options: {
    userId?: string;
    limit?: number;
    offset?: number;
    retryConfig?: RetryConfig;
  } = {}
) {
  const { userId, limit = 50, offset = 0, retryConfig } = options;

  return retryWithBackoff(async () => {
    const params = new URLSearchParams();
    if (userId) params.set('user_id', userId);
    params.set('limit', limit.toString());
    params.set('offset', offset.toString());

    const response = await fetch(`/api/chat/conversations?${params}`);
    await handleResponse(response);
    return response.json();
  }, retryConfig);
}

export async function createConversation(data: {
  userId?: string;
  title?: string;
  metadata?: Record<string, unknown>;
  retryConfig?: RetryConfig;
}) {
  const { userId, title, metadata, retryConfig } = data;

  return retryWithBackoff(async () => {
    const response = await fetch('/api/chat/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        title,
        metadata
      })
    });
    await handleResponse(response);
    return response.json();
  }, retryConfig);
}

export async function getConversation(
  id: string,
  options: {
    includeMessages?: boolean;
    limit?: number;
    offset?: number;
    retryConfig?: RetryConfig;
  } = {}
) {
  const { includeMessages = true, limit = 100, offset = 0, retryConfig } = options;

  return retryWithBackoff(async () => {
    const params = new URLSearchParams();
    params.set('include_messages', includeMessages.toString());
    params.set('limit', limit.toString());
    params.set('offset', offset.toString());

    const response = await fetch(`/api/chat/conversations/${id}?${params}`);
    await handleResponse(response);
    return response.json();
  }, retryConfig);
}

export async function updateConversation(
  id: string,
  data: {
    title?: string;
    metadata?: Record<string, unknown>;
    retryConfig?: RetryConfig;
  }
) {
  const { title, metadata, retryConfig } = data;

  return retryWithBackoff(async () => {
    const response = await fetch(`/api/chat/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, metadata })
    });
    await handleResponse(response);
    return response.json();
  }, retryConfig);
}

export async function deleteConversation(id: string, retryConfig?: RetryConfig) {
  return retryWithBackoff(async () => {
    const response = await fetch(`/api/chat/conversations/${id}`, {
      method: 'DELETE'
    });
    await handleResponse(response);
    return response.json();
  }, retryConfig);
}

// ============================================================================
// MESSAGE API
// ============================================================================

export async function listMessages(
  conversationId: string,
  options: {
    limit?: number;
    offset?: number;
    retryConfig?: RetryConfig;
  } = {}
) {
  const { limit = 100, offset = 0, retryConfig } = options;

  return retryWithBackoff(async () => {
    const params = new URLSearchParams();
    params.set('limit', limit.toString());
    params.set('offset', offset.toString());

    const response = await fetch(`/api/chat/conversations/${conversationId}/messages?${params}`);
    await handleResponse(response);
    return response.json();
  }, retryConfig);
}

export async function createMessage(
  conversationId: string,
  data: {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    parts?: unknown;
    metadata?: Record<string, unknown>;
    retryConfig?: RetryConfig;
  }
) {
  const { role, content, parts, metadata, retryConfig } = data;

  return retryWithBackoff(async () => {
    const response = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, content, parts, metadata })
    });
    await handleResponse(response);
    return response.json();
  }, retryConfig);
}

// ============================================================================
// SNAPSHOT API
// ============================================================================

export async function listSnapshots(conversationId: string, retryConfig?: RetryConfig) {
  return retryWithBackoff(async () => {
    const params = new URLSearchParams({ conversation_id: conversationId });
    const response = await fetch(`/api/chat/snapshots?${params}`);
    await handleResponse(response);
    return response.json();
  }, retryConfig);
}

export async function createSnapshot(data: {
  conversationId: string;
  messageId?: string;
  description?: string;
  state: Record<string, unknown>;
  retryConfig?: RetryConfig;
}) {
  const { conversationId, messageId, description, state, retryConfig } = data;

  return retryWithBackoff(async () => {
    const response = await fetch('/api/chat/snapshots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: conversationId,
        message_id: messageId,
        description,
        state
      })
    });
    await handleResponse(response);
    return response.json();
  }, retryConfig);
}

export async function getSnapshot(id: string, retryConfig?: RetryConfig) {
  return retryWithBackoff(async () => {
    const response = await fetch(`/api/chat/snapshots/${id}`);
    await handleResponse(response);
    return response.json();
  }, retryConfig);
}

export async function deleteSnapshot(id: string, retryConfig?: RetryConfig) {
  return retryWithBackoff(async () => {
    const response = await fetch(`/api/chat/snapshots/${id}`, {
      method: 'DELETE'
    });
    await handleResponse(response);
    return response.json();
  }, retryConfig);
}

// ============================================================================
// UTILITY
// ============================================================================

export function getRateLimitInfo(response: Response): {
  limit: number;
  remaining: number;
  reset: Date | null;
} {
  const limit = parseInt(response.headers.get('X-RateLimit-Limit') || '0', 10);
  const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '0', 10);
  const resetHeader = response.headers.get('X-RateLimit-Reset');
  const reset = resetHeader ? new Date(resetHeader) : null;

  return { limit, remaining, reset };
}
