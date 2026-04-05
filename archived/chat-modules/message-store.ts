/**
 * Message store - centralized state management for chat messages
 */

import type { ChatMessage, ChatState, ChatStatus } from './types';

class MessageStore {
  private state = $state<ChatState>({
    messages: [],
    status: 'idle',
    error: null,
    conversationId: null
  });

  get messages(): ChatMessage[] {
    return this.state.messages;
  }

  get status(): ChatStatus {
    return this.state.status;
  }

  get error(): string | null {
    return this.state.error;
  }

  get conversationId(): string | null {
    return this.state.conversationId;
  }

  setConversationId(id: string | null) {
    this.state.conversationId = id;
  }

  setStatus(status: ChatStatus) {
    this.state.status = status;
  }

  setError(error: string | null) {
    this.state.error = error;
  }

  addMessage(message: ChatMessage) {
    this.state.messages = [...this.state.messages, message];
  }

  updateMessage(id: string, updates: Partial<ChatMessage>) {
    this.state.messages = this.state.messages.map((msg) =>
      msg.id === id ? { ...msg, ...updates } : msg
    );
  }

  setMessages(messages: ChatMessage[]) {
    this.state.messages = messages;
  }

  clearMessages() {
    this.state.messages = [];
    this.state.error = null;
  }

  reset() {
    this.state = {
      messages: [],
      status: 'idle',
      error: null,
      conversationId: null
    };
  }
}

export const messageStore = new MessageStore();
