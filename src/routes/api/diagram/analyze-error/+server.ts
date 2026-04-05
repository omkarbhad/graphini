import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

// Python backend service URL (configure via environment variable)
const PYTHON_BACKEND_URL = env.PYTHON_BACKEND_URL || 'http://localhost:8000';

interface ErrorAnalysisRequest {
  error_message: string;
  code: string;
}

interface ErrorAnalysisResponse {
  line_number: number;
  problematic_line: string;
  simplified_message: string;
}

export const POST: RequestHandler = async ({ request }) => {
  let body: ErrorAnalysisRequest;

  try {
    body = await request.json();
  } catch {
    throw error(400, { message: 'Invalid JSON payload' });
  }

  const { error_message, code } = body;

  // Validate input
  if (!error_message || typeof error_message !== 'string' || !error_message.trim()) {
    throw error(400, { message: 'Missing or invalid error_message parameter' });
  }

  if (!code || typeof code !== 'string') {
    throw error(400, { message: 'Missing or invalid code parameter' });
  }

  try {
    const pythonResponse = await fetch(`${PYTHON_BACKEND_URL}/analyze-error`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        error_message: error_message.trim(),
        code: code
      }),
      signal: AbortSignal.timeout(10000) // 10 second timeout
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

    const result: ErrorAnalysisResponse = await pythonResponse.json();
    return json(result);
  } catch (fetchError: unknown) {
    console.error('Failed to analyze error:', fetchError);

    if (fetchError && typeof fetchError === 'object' && 'status' in fetchError) {
      throw fetchError;
    }

    if (fetchError instanceof Error) {
      if (fetchError.name === 'AbortError' || fetchError.message.includes('timeout')) {
        throw error(504, { message: 'Request timeout - error analysis took too long' });
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
        message: `Failed to analyze error: ${fetchError.message}`
      });
    }

    throw error(500, {
      message: `Failed to analyze error: ${String(fetchError)}`
    });
  }
};
