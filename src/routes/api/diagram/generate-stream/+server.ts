import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { apiLimiter, getClientKey, rateLimitResponse } from '$lib/server/rate-limit';

// Python backend service URL (configure via environment variable)
const PYTHON_BACKEND_URL = env.PYTHON_BACKEND_URL || 'http://localhost:8000';

// Maximum payload size (in characters)
const MAX_PAYLOAD_LENGTH = 100000;

interface DiagramGenerationRequest {
  prompt: string;
  diagramType?: string;
  complexity?: 'simple' | 'medium' | 'complex' | 'large';
  options?: Record<string, unknown>;
}

export const POST: RequestHandler = async ({ request }) => {
  const rl = apiLimiter.check(getClientKey(request));
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs ?? 0);

  // Check if Python backend is configured
  if (!env.PYTHON_BACKEND_URL && PYTHON_BACKEND_URL === 'http://localhost:8000') {
    console.warn('Python backend URL not configured, using default localhost');
  }

  let body: DiagramGenerationRequest;

  try {
    body = await request.json();
  } catch {
    throw error(400, { message: 'Invalid JSON payload' });
  }

  const { prompt, diagramType, complexity = 'medium', options = {} } = body;

  // Validate input
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw error(400, { message: 'Missing or invalid prompt parameter' });
  }

  if (prompt.length > MAX_PAYLOAD_LENGTH) {
    throw error(413, {
      message: `Prompt exceeds maximum length of ${MAX_PAYLOAD_LENGTH} characters`
    });
  }

  try {
    // Build request body, only including defined fields
    const requestBody: Record<string, unknown> = {
      prompt,
      complexity: complexity || 'medium'
    };

    if (diagramType) {
      requestBody.diagram_type = diagramType;
    }

    if (options && Object.keys(options).length > 0) {
      requestBody.options = options;
    }

    // Forward streaming request to Python backend
    const pythonResponse = await fetch(`${PYTHON_BACKEND_URL}/generate/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream'
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(300000) // 5 minute timeout for large diagrams
    });

    if (!pythonResponse.ok) {
      let errorMessage = pythonResponse.statusText;
      try {
        const errorData = await pythonResponse.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        try {
          const errorText = await pythonResponse.text();
          errorMessage = errorText || errorMessage;
        } catch {
          // Use statusText as fallback
        }
      }
      console.error('Python backend error:', {
        status: pythonResponse.status,
        statusText: pythonResponse.statusText,
        message: errorMessage
      });
      throw error(pythonResponse.status, {
        message: errorMessage || `Python backend error: ${pythonResponse.statusText}`
      });
    }

    // Return streaming response
    return new Response(pythonResponse.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no'
      }
    });
  } catch (fetchError: unknown) {
    console.error('Failed to generate diagram stream:', fetchError);

    // If it's already a SvelteKit error, re-throw it
    if (fetchError && typeof fetchError === 'object' && 'status' in fetchError) {
      throw fetchError;
    }

    if (fetchError instanceof Error) {
      if (fetchError.name === 'AbortError' || fetchError.message.includes('timeout')) {
        throw error(504, { message: 'Request timeout - diagram generation took too long' });
      }
      if (
        fetchError.message.includes('ECONNREFUSED') ||
        fetchError.message.includes('fetch failed')
      ) {
        throw error(503, {
          message:
            'Python backend service is not available. Make sure the backend server is running on port 8000.'
        });
      }
      throw error(500, {
        message: `Failed to generate diagram: ${fetchError.message}`
      });
    }

    throw error(500, {
      message: `Failed to generate diagram: ${String(fetchError)}`
    });
  }
};
