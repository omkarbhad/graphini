/**
 * Client-side utility for generating large/complex Mermaid diagrams via Python backend
 */

import { errorToString } from './errorToString';
export interface DiagramGenerationOptions {
  prompt: string;
  diagramType?:
    | 'flowchart'
    | 'sequence'
    | 'class'
    | 'state'
    | 'er'
    | 'gantt'
    | 'pie'
    | 'journey'
    | 'mindmap';
  complexity?: 'simple' | 'medium' | 'complex' | 'large';
  options?: Record<string, unknown>;
}

export interface DiagramGenerationResponse {
  success: boolean;
  mermaid_code: string;
  diagram_type?: string;
  metadata?: Record<string, unknown>;
  generation_time?: number;
  complexity?: string;
  error?: string;
}

/**
 * Generate a Mermaid diagram using the Python backend with streaming
 * @param options Generation options including prompt and diagram type
 * @param onChunk Callback function called with each chunk of generated code
 * @returns Promise with the generated Mermaid code
 */
export async function generateDiagramStream(
  options: DiagramGenerationOptions,
  onChunk: (chunk: string, complete: boolean) => void
): Promise<DiagramGenerationResponse> {
  const { prompt, diagramType, complexity = 'medium', options: extraOptions = {} } = options;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw new Error('Prompt is required and must be a non-empty string');
  }

  try {
    const response = await fetch('/api/diagram/generate-stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt.trim(),
        diagramType,
        complexity,
        options: extraOptions
      })
    });

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const errorData = await response.json();
        let detail: unknown = errorData.detail;
        if (Array.isArray(detail)) {
          detail = detail
            .map((item) => {
              if (typeof item === 'string') return item;
              if (item && typeof item === 'object') {
                const msg = 'msg' in item ? String(item.msg) : undefined;
                const loc = 'loc' in item ? String(item.loc) : undefined;
                return [msg, loc].filter(Boolean).join(' - ') || JSON.stringify(item);
              }
              return String(item ?? '');
            })
            .filter(Boolean)
            .join('; ');
        }
        errorMessage = (errorData.message as string) || (detail as string) || errorMessage;
      } catch {
        try {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        } catch {
          // Use statusText as fallback
        }
      }
      throw new Error(errorMessage || `Server error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let accumulatedCode = '';
    let metadata: Record<string, unknown> | null = null;

    if (!reader) {
      throw new Error('Response body is not readable');
    }

    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // Process complete lines (ending with \n)
      const lines = buffer.split('\n');
      // Keep the last incomplete line in buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() && line.startsWith('data: ')) {
          try {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            const data = JSON.parse(jsonStr);

            if (data.type === 'chunk') {
              if (data.complete) {
                // Final complete code
                accumulatedCode = data.content || '';
                onChunk(accumulatedCode, true);
              } else {
                // Partial chunk
                const chunkContent = data.content || '';
                accumulatedCode += chunkContent;
                onChunk(chunkContent, false);
              }
            } else if (data.type === 'metadata') {
              metadata = data.metadata || {};
            } else if (data.type === 'error') {
              throw new Error(data.message || 'Unknown error during streaming');
            } else if (data.type === 'done') {
              // Stream complete
              break;
            }
          } catch (e) {
            // Skip malformed JSON lines - log but don't break
            if (e instanceof SyntaxError) {
              // Incomplete JSON - this is normal for streaming
              console.debug(
                'Incomplete JSON chunk (normal for streaming):',
                line.substring(0, 100)
              );
            } else {
              console.warn('Failed to parse SSE data:', line.substring(0, 100), e);
            }
          }
        } else if (line.trim() && !line.startsWith('data: ')) {
          // Skip non-data lines (comments, empty lines, etc.)
          continue;
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim() && buffer.startsWith('data: ')) {
      try {
        const jsonStr = buffer.slice(6).trim();
        if (jsonStr) {
          const data = JSON.parse(jsonStr);
          if (data.type === 'chunk' && data.complete) {
            accumulatedCode = data.content || '';
            onChunk(accumulatedCode, true);
          }
        }
      } catch {
        // Ignore parse errors in final buffer
      }
    }

    return {
      complexity: (metadata?.complexity as string) || complexity,
      diagram_type: diagramType,
      generation_time: metadata?.generation_time as number,
      mermaid_code: accumulatedCode,
      metadata: metadata || {},
      success: true
    };
  } catch (error) {
    console.error('Failed to generate diagram stream:', error);
    const message = errorToString(error, 'Failed to generate diagram');
    throw new Error(message);
  }
}

/**
 * Generate a Mermaid diagram using the Python backend (non-streaming)
 * @param options Generation options including prompt and diagram type
 * @returns Promise with the generated Mermaid code
 */
export async function generateDiagram(
  options: DiagramGenerationOptions
): Promise<DiagramGenerationResponse> {
  const { prompt, diagramType, complexity = 'medium', options: extraOptions = {} } = options;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw new Error('Prompt is required and must be a non-empty string');
  }

  try {
    const response = await fetch('/api/diagram/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt.trim(),
        diagramType,
        complexity,
        options: extraOptions
      })
    });

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const errorData = await response.json();
        // Handle common FastAPI/SvelteKit error formats
        let detail: unknown = errorData.detail;
        if (Array.isArray(detail)) {
          detail = detail
            .map((item) => {
              if (typeof item === 'string') return item;
              if (item && typeof item === 'object') {
                const msg = 'msg' in item ? String(item.msg) : undefined;
                const loc = 'loc' in item ? String(item.loc) : undefined;
                return [msg, loc].filter(Boolean).join(' - ') || JSON.stringify(item);
              }
              return String(item ?? '');
            })
            .filter(Boolean)
            .join('; ');
        }
        errorMessage = (errorData.message as string) || (detail as string) || errorMessage;
      } catch {
        // If response is not JSON, try to get text
        try {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        } catch {
          // Use statusText as fallback
        }
      }
      throw new Error(errorMessage || `Server error: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to generate diagram:', error);
    const message = errorToString(error, 'Failed to generate diagram');
    throw new Error(message);
  }
}

/**
 * Check if Python backend is available
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch('/api/diagram/health', {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch {
    return false;
  }
}
