/**
 * Chat service - handles all chat-related business logic
 */

import type { ChatMessage, StreamEvent, DiagramData } from './types';

export class ChatService {
  private baseUrl = '/api/chat';

  /**
   * Send a chat message and handle streaming response
   */
  async sendMessage(params: {
    conversationId: string;
    message: string;
    currentDiagram?: string;
    mode?: string;
    model?: string;
    onStream?: (event: StreamEvent) => void;
  }): Promise<ChatMessage> {
    const { conversationId, message, currentDiagram, mode, model, onStream } = params;

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        message: {
          role: 'user',
          content: message,
          parts: [{ type: 'text', text: message }]
        },
        currentDiagram,
        mode,
        model
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || 'Failed to send message');
    }

    // Handle streaming response
    if (response.headers.get('content-type')?.includes('text/plain')) {
      return this.handleStreamingResponse(response, onStream);
    }

    // Fallback to JSON response
    const data = await response.json();
    return data.assistant;
  }

  /**
   * Handle Server-Sent Events streaming
   */
  private async handleStreamingResponse(
    response: Response,
    onStream?: (event: StreamEvent) => void
  ): Promise<ChatMessage> {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    if (!reader) {
      throw new Error('No response body');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          try {
            const event = JSON.parse(line.slice(6)) as StreamEvent;

            if (event.type === 'text' && event.content) {
              fullContent += event.content;
            }

            onStream?.(event);
          } catch (e) {
            console.warn('Failed to parse SSE event:', e);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: fullContent,
      parts: [{ type: 'text', text: fullContent }]
    };
  }

  /**
   * Extract Mermaid code from message content
   */
  extractMermaidCode(content: string): string | null {
    // Try fenced code block first
    const fencedMatch = content.match(/```mermaid\n?([\s\S]*?)```/);
    if (fencedMatch?.[1]) {
      return fencedMatch[1].trim();
    }

    // Try direct diagram syntax
    const trimmed = content.trim();
    const diagramTypes = [
      'flowchart',
      'sequenceDiagram',
      'classDiagram',
      'stateDiagram',
      'erDiagram',
      'gantt',
      'pie',
      'journey'
    ];

    for (const type of diagramTypes) {
      if (trimmed.startsWith(type)) {
        return trimmed;
      }
    }

    return null;
  }

  /**
   * Extract diagram data from stream event
   */
  extractDiagramData(event: StreamEvent): DiagramData | null {
    if (event.type !== 'diagram' || !event.data) {
      return null;
    }

    const { diagram_type, title, mermaid_code, explanation } = event.data;

    if (!diagram_type || !mermaid_code) {
      return null;
    }

    return {
      type: diagram_type as string,
      title: title as string,
      code: mermaid_code as string,
      explanation: explanation as string | undefined
    };
  }
}

export const chatService = new ChatService();
