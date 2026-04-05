// Helper functions for chat components

import type { Message, Conversation, Questionnaire, QuestionnaireResponse } from './messageTypes';
import { CHAT_CONSTANTS } from './chatConstants';

/**
 * Generate a unique ID for messages and conversations
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString();
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Generate conversation title from first message
 */
export function generateConversationTitle(message: string): string {
  const words = message.trim().split(/\s+/);
  if (words.length <= 5) return message;

  return words.slice(0, 5).join(' ') + '...';
}

/**
 * Calculate reading time for message
 */
export function calculateReadingTime(text: string): number {
  const wordsPerMinute = 200;
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

/**
 * Validate message content
 */
export function validateMessage(message: string): { valid: boolean; error?: string } {
  if (!message || !message.trim()) {
    return { valid: false, error: 'Message cannot be empty' };
  }

  if (message.length > CHAT_CONSTANTS.MAX_MESSAGE_LENGTH) {
    return { valid: false, error: 'Message is too long' };
  }

  return { valid: true };
}

/**
 * Validate attachment
 */
export function validateAttachment(file: File): { valid: boolean; error?: string } {
  if (file.size > CHAT_CONSTANTS.MAX_ATTACHMENT_SIZE) {
    return { valid: false, error: 'File is too large' };
  }

  // Add more validation as needed
  return { valid: true };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file type category
 */
export function getFileTypeCategory(mimeType: string): 'image' | 'document' | 'code' | 'other' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.includes('text') || mimeType.includes('document')) return 'document';
  if (mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('xml'))
    return 'code';
  return 'other';
}

/**
 * Extract code blocks from message
 */
export function extractCodeBlocks(message: string): Array<{ language: string; code: string }> {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const codeBlocks: Array<{ language: string; code: string }> = [];

  let match;
  while ((match = codeBlockRegex.exec(message)) !== null) {
    codeBlocks.push({
      language: match[1] || 'text',
      code: match[2].trim()
    });
  }

  return codeBlocks;
}

/**
 * Check if message contains code
 */
export function containsCode(message: string): boolean {
  return extractCodeBlocks(message).length > 0;
}

/**
 * Sanitize message content
 */
export function sanitizeMessage(message: string): string {
  // Basic sanitization - can be extended
  return message
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Check if two messages are duplicates
 */
export function isDuplicateMessage(msg1: Message, msg2: Message): boolean {
  return (
    msg1.role === msg2.role &&
    msg1.content === msg2.content &&
    Math.abs(msg1.timestamp.getTime() - msg2.timestamp.getTime()) < 1000
  );
}

/**
 * Filter messages by role
 */
export function filterMessagesByRole(messages: Message[], role: Message['role']): Message[] {
  return messages.filter((msg) => msg.role === role);
}

/**
 * Get last message from conversation
 */
export function getLastMessage(conversation: Conversation): Message | null {
  return conversation.messages.length > 0
    ? conversation.messages[conversation.messages.length - 1]
    : null;
}

/**
 * Calculate conversation statistics
 */
export function getConversationStats(conversation: Conversation) {
  const messages = conversation.messages;
  const userMessages = filterMessagesByRole(messages, 'user');
  const assistantMessages = filterMessagesByRole(messages, 'assistant');

  return {
    totalMessages: messages.length,
    userMessages: userMessages.length,
    assistantMessages: assistantMessages.length,
    totalWords: messages.reduce((sum, msg) => sum + msg.content.split(/\s+/).length, 0),
    averageResponseTime: calculateAverageResponseTime(messages),
    hasCode: messages.some((msg) => containsCode(msg.content)),
    hasAttachments: messages.some((msg) => msg.attachments && msg.attachments.length > 0)
  };
}

/**
 * Calculate average response time
 */
export function calculateAverageResponseTime(messages: Message[]): number {
  const responseTimes: number[] = [];

  for (let i = 1; i < messages.length; i++) {
    const current = messages[i];
    const previous = messages[i - 1];

    if (current.role === 'assistant' && previous.role === 'user') {
      responseTimes.push(current.timestamp.getTime() - previous.timestamp.getTime());
    }
  }

  if (responseTimes.length === 0) return 0;

  const average = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  return Math.round(average / 1000); // Convert to seconds
}

/**
 * Search messages
 */
export function searchMessages(messages: Message[], query: string): Message[] {
  const lowercaseQuery = query.toLowerCase();

  return messages.filter(
    (msg) =>
      msg.content.toLowerCase().includes(lowercaseQuery) ||
      msg.reasoning?.toLowerCase().includes(lowercaseQuery)
  );
}

/**
 * Export conversation to JSON
 */
export function exportConversation(conversation: Conversation): string {
  return JSON.stringify(conversation, null, 2);
}

/**
 * Import conversation from JSON
 */
export function importConversation(json: string): Conversation | null {
  try {
    const parsed = JSON.parse(json);

    // Basic validation
    if (!parsed.id || !parsed.messages || !Array.isArray(parsed.messages)) {
      return null;
    }

    return parsed as Conversation;
  } catch {
    return null;
  }
}
