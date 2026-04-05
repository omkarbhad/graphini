import { env } from '$env/dynamic/private';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Python backend service URL (configure via environment variable)
const PYTHON_BACKEND_URL = env.PYTHON_BACKEND_URL || 'http://localhost:8000';

// Maximum size for the Mermaid code to be repaired (in characters)
const MAX_CODE_LENGTH = 10000;

interface RepairRequest {
  code: string;
  error_message?: string;
}

interface RepairResponse {
  repaired_code: string;
  repaired_line_number?: number;
  success: boolean;
}

export const POST: RequestHandler = async ({ request }) => {
  let body: RepairRequest;

  try {
    body = await request.json();
  } catch {
    throw error(400, { message: 'Invalid JSON payload' });
  }

  const { code } = body;

  // Validate input
  if (!code || typeof code !== 'string' || !code.trim()) {
    throw error(400, { message: 'Missing or invalid code parameter' });
  }

  if (code.length > MAX_CODE_LENGTH) {
    throw error(413, {
      message: `Code exceeds maximum length of ${MAX_CODE_LENGTH} characters`
    });
  }

  try {
    // Forward request to Python backend
    const pythonResponse = await fetch(`${PYTHON_BACKEND_URL}/repair`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        code: code.trim(),
        error_message: body.error_message || null
      }),
      signal: AbortSignal.timeout(60000) // 60 second timeout
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

    const result: RepairResponse = await pythonResponse.json();

    // Validate response structure
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid response from Python backend');
    }

    if (!result.repaired_code || typeof result.repaired_code !== 'string') {
      throw new Error('Missing or invalid repaired_code in response');
    }

    return json({
      code: result.repaired_code,
      originalLength: code.length,
      repairedLength: result.repaired_code.length,
      repaired_line_number: result.repaired_line_number,
      success: true
    });
  } catch (fetchError: unknown) {
    console.error('Failed to repair diagram:', fetchError);

    if (fetchError && typeof fetchError === 'object' && 'status' in fetchError) {
      throw fetchError;
    }

    if (fetchError instanceof Error) {
      if (fetchError.name === 'AbortError' || fetchError.message.includes('timeout')) {
        throw error(504, { message: 'Request timeout - repair took too long' });
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
        message: `Failed to repair diagram: ${fetchError.message}`
      });
    }

    throw error(500, {
      message: `Failed to repair diagram: ${String(fetchError)}`
    });
  }
};

// Add OPTIONS method for CORS preflight
import type { RequestHandler as OptionsRequestHandler } from './$types';

export const OPTIONS: OptionsRequestHandler = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400' // 24 hours
    }
  });
};
