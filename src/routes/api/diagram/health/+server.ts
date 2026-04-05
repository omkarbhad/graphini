import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

// Python backend service URL (configure via environment variable)
const PYTHON_BACKEND_URL = env.PYTHON_BACKEND_URL || 'http://localhost:8000';

export const GET: RequestHandler = async () => {
  try {
    // Check Python backend health
    const response = await fetch(`${PYTHON_BACKEND_URL}/health`, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      },
      signal: AbortSignal.timeout(10000) // Increased timeout for health checks
    });

    if (!response.ok) {
      return json(
        {
          available: false,
          status: response.status,
          message: 'Python backend is not healthy'
        },
        { status: 503 }
      );
    }

    const health = await response.json().catch(() => ({}));

    return json({
      available: true,
      status: response.status,
      backend_url: PYTHON_BACKEND_URL,
      ...health
    });
  } catch (fetchError: unknown) {
    console.error('Python backend health check failed:', fetchError);

    return json(
      {
        available: false,
        status: 503,
        message: 'Python backend service is not available',
        error: fetchError instanceof Error ? fetchError.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
};
