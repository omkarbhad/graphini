/**
 * Gemini Streaming Response Handler
 * Handles streaming responses from Gemini API and converts to SSE format
 */

export interface GeminiStreamingEvent {
  type: string;
  content?: string;
  functionCall?: any;
  done?: boolean;
  error?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Convert Gemini content format to chat messages
 */
export function convertToGeminiMessages(messages: ChatMessage[]): any[] {
  return messages.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));
}

/**
 * Stream response from Gemini and convert to SSE events
 */
export async function* geminiStreamResponse(
  model: any,
  messages: ChatMessage[],
  tools: any[]
): AsyncGenerator<GeminiStreamingEvent> {
  try {
    const geminiMessages = convertToGeminiMessages(messages);

    const result = await model.generateContentStream({
      contents: geminiMessages,
      tools: tools.length > 0 ? tools[0] : undefined
    });

    let currentContent = '';
    let functionCall: any = null;

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();

      if (chunkText) {
        currentContent += chunkText;

        // Send text delta event
        yield {
          type: 'text',
          content: chunkText
        };
      }

      // Check for function calls in the chunk
      if (chunk.functionCall && chunk.functionCall.name && chunk.functionCall.name !== 'unknown') {
        functionCall = chunk.functionCall;

        // Send function call event
        yield {
          type: 'function_call',
          functionCall: {
            id: `gemini_${Date.now()}`,
            name: functionCall.name || 'unknown',
            arguments: JSON.stringify(functionCall.args || {})
          }
        };
      }
    }

    // Send final event
    yield {
      type: 'done',
      done: true
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check for quota exceeded errors
    if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
      yield {
        type: 'error',
        error: 'Free tier quota exceeded. Please try again later or upgrade to a paid plan.',
        done: true
      };
    } else {
      yield {
        type: 'error',
        error: `Gemini API error: ${errorMessage}`,
        done: true
      };
    }
  }
}

/**
 * Handle function response and continue conversation
 */
export async function* geminiContinueWithFunctionResponse(
  model: any,
  messages: ChatMessage[],
  functionResponse: any
): AsyncGenerator<GeminiStreamingEvent> {
  try {
    // Add function response to conversation
    const updatedMessages = [
      ...messages,
      {
        role: 'assistant' as const,
        content: '',
        functionCall: functionResponse.functionCall
      },
      {
        role: 'user' as const,
        content: JSON.stringify(functionResponse.result)
      }
    ];

    // Generate response with function result
    const geminiMessages = convertToGeminiMessages(updatedMessages);

    const result = await model.generateContentStream({
      contents: geminiMessages
    });

    let currentContent = '';

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();

      if (chunkText) {
        currentContent += chunkText;

        yield {
          type: 'text',
          content: chunkText
        };
      }
    }

    yield {
      type: 'done',
      done: true
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    yield {
      type: 'error',
      error: `Gemini API error: ${errorMessage}`,
      done: true
    };
  }
}

/**
 * Check if error is related to free tier limits
 */
export function isFreeTierError(error: any): boolean {
  const message = error?.message || error?.toString() || '';
  return (
    message.includes('quota') ||
    message.includes('rate limit') ||
    message.includes('billing') ||
    message.includes('payment required') ||
    message.includes('insufficient quota')
  );
}

/**
 * Get user-friendly error message for free tier limits
 */
export function getFreeTierErrorMessage(error: any): string {
  if (isFreeTierError(error)) {
    return 'Free tier quota exceeded. Please upgrade to a paid plan or try again later.';
  }
  return error?.message || 'An unknown error occurred';
}
