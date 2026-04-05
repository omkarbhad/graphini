/**
 * API middleware for standardized error handling and responses
 */

import {
  createClientError,
  createServerError,
  createValidationError,
  getRequestId,
  sendErrorResponse
} from '$lib/server/error-responses';
import type { RequestEvent } from '@sveltejs/kit';

// ==================== Middleware Types ====================

export interface ApiMiddleware {
  name: string;
  execute: (event: RequestEvent, next: () => Promise<Response>) => Promise<Response>;
}

export interface MiddlewareContext {
  requestId: string;
  startTime: number;
  metadata: Record<string, unknown>;
}

// ==================== Error Handling Middleware ====================

export const errorHandlerMiddleware: ApiMiddleware = {
  name: 'errorHandler',
  async execute(event: RequestEvent, next: () => Promise<Response>): Promise<Response> {
    const requestId = getRequestId(event.request.headers);
    const startTime = Date.now();

    try {
      const response = await next();

      // Log successful requests
      const duration = Date.now() - startTime;
      console.log(
        `[${requestId}] ${event.request.method} ${event.request.url} - ${response.status} (${duration}ms)`
      );

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log errors
      console.error(
        `[${requestId}] ${event.request.method} ${event.request.url} - ERROR (${duration}ms):`,
        errorMessage
      );

      // Handle different error types
      if (error instanceof ValidationError) {
        return sendErrorResponse(
          createValidationError(error.message, error.details, requestId),
          400
        );
      }

      if (error instanceof AuthenticationError) {
        return sendErrorResponse(
          createClientError(error.message, 'UNAUTHORIZED', error.details, requestId),
          401
        );
      }

      if (error instanceof AuthorizationError) {
        return sendErrorResponse(
          createClientError(error.message, 'FORBIDDEN', error.details, requestId),
          403
        );
      }

      if (error instanceof NotFoundError) {
        return sendErrorResponse(
          createClientError(error.message, 'NOT_FOUND', error.details, requestId),
          404
        );
      }

      if (error instanceof RateLimitError) {
        return sendErrorResponse(
          createClientError(error.message, 'RATE_LIMITED', error.details, requestId),
          429
        );
      }

      if (error instanceof DatabaseError) {
        return sendErrorResponse(
          createServerError(error.message, 'DATABASE_ERROR', error.details, requestId),
          503
        );
      }

      if (error instanceof TimeoutError) {
        return sendErrorResponse(
          createServerError(error.message, 'TIMEOUT', error.details, requestId),
          408
        );
      }

      // Default server error
      return sendErrorResponse(
        createServerError(
          process.env.NODE_ENV === 'development' ? errorMessage : 'Internal server error',
          'INTERNAL_ERROR',
          { originalError: errorMessage },
          requestId
        ),
        500
      );
    }
  }
};

// ==================== Validation Middleware ====================

export const validationMiddleware: ApiMiddleware = {
  name: 'validation',
  async execute(event: RequestEvent, next: () => Promise<Response>): Promise<Response> {
    const requestId = getRequestId(event.request.headers);

    // Validate content type for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(event.request.method)) {
      const contentType = event.request.headers.get('content-type');

      if (!contentType?.includes('application/json')) {
        return sendErrorResponse(
          createClientError(
            'Content-Type must be application/json',
            'BAD_REQUEST',
            undefined,
            requestId
          ),
          400
        );
      }
    }

    // Validate request size
    const contentLength = event.request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 10 * 1024 * 1024) {
      // 10MB limit
      return sendErrorResponse(
        createClientError('Request body too large', 'BAD_REQUEST', { maxSize: '10MB' }, requestId),
        413
      );
    }

    return next();
  }
};

// ==================== Rate Limiting Middleware ====================

export const rateLimitMiddleware: ApiMiddleware = {
  name: 'rateLimit',
  async execute(event: RequestEvent, next: () => Promise<Response>): Promise<Response> {
    const requestId = getRequestId(event.request.headers);
    const clientAddress = event.getClientAddress();

    // Simple in-memory rate limiting (in production, use Redis)
    const requests = global._rateLimitRequests || (global._rateLimitRequests = new Map());
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 100; // 100 requests per minute
    const maxMapSize = 10000; // Maximum number of entries to prevent memory leak

    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    for (const [key, data] of requests.entries()) {
      if (data.timestamp < windowStart) {
        requests.delete(key);
      }
    }

    // If map is still too large after cleanup, clear oldest entries
    if (requests.size > maxMapSize) {
      const entries = Array.from(requests.entries()) as [
        string,
        { count: number; timestamp: number }
      ][];
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = entries.slice(0, requests.size - maxMapSize + 1000);
      for (const [key] of toDelete) {
        requests.delete(key);
      }
    }

    // Check current requests
    const key = `${clientAddress}:${Math.floor(now / windowMs)}`;
    const current = requests.get(key) || { count: 0, timestamp: now };

    if (current.count >= maxRequests) {
      return sendErrorResponse(
        createClientError(
          'Rate limit exceeded',
          'RATE_LIMITED',
          {
            maxRequests,
            windowMs,
            retryAfter: 60
          },
          requestId
        ),
        429
      );
    }

    // Increment counter
    requests.set(key, { count: current.count + 1, timestamp: now });

    return next();
  }
};

// ==================== CORS Middleware ====================

export const corsMiddleware: ApiMiddleware = {
  name: 'cors',
  async execute(event: RequestEvent, next: () => Promise<Response>): Promise<Response> {
    const response = await next();

    // Add CORS headers
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
    headers.set('Access-Control-Max-Age', '86400');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};

// ==================== Request ID Middleware ====================

export const requestIdMiddleware: ApiMiddleware = {
  name: 'requestId',
  async execute(event: RequestEvent, next: () => Promise<Response>): Promise<Response> {
    const requestId = getRequestId(event.request.headers);

    // Add request ID to response headers
    const response = await next();
    const headers = new Headers(response.headers);
    headers.set('X-Request-ID', requestId);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};

// ==================== Middleware Chain ====================

export function createMiddlewareChain(middlewares: ApiMiddleware[], event: RequestEvent) {
  let index = 0;

  async function dispatch(): Promise<Response> {
    if (index >= middlewares.length) {
      throw new Error('No handler provided for middleware chain');
    }

    const middleware = middlewares[index++];

    return middleware.execute(event, dispatch);
  }

  return dispatch;
}

// ==================== Custom Error Classes ====================

export class ValidationError extends Error {
  constructor(
    message: string,
    public details: Array<{ field: string; message: string; code: string; value?: unknown }> = []
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(
    message: string = 'Authentication required',
    public details?: unknown
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(
    message: string = 'Insufficient permissions',
    public details?: unknown
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  constructor(
    message: string = 'Resource not found',
    public details?: unknown
  ) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends Error {
  constructor(
    message: string = 'Rate limit exceeded',
    public details?: unknown
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class DatabaseError extends Error {
  constructor(
    message: string = 'Database operation failed',
    public details?: unknown
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class TimeoutError extends Error {
  constructor(
    message: string = 'Request timeout',
    public details?: unknown
  ) {
    super(message);
    this.name = 'TimeoutError';
  }
}

// ==================== Default Middleware Stack ====================

export const defaultMiddlewareStack: ApiMiddleware[] = [
  requestIdMiddleware,
  corsMiddleware,
  rateLimitMiddleware,
  validationMiddleware,
  errorHandlerMiddleware
];

// ==================== Helper Function ====================

export function withMiddleware(
  handler: (event: RequestEvent) => Promise<Response>,
  middlewares: ApiMiddleware[] = defaultMiddlewareStack
) {
  return async (event: RequestEvent): Promise<Response> => {
    const chain = createMiddlewareChain(
      [
        ...middlewares,
        {
          name: 'handler',
          async execute(event: RequestEvent): Promise<Response> {
            return handler(event);
          }
        }
      ],
      event
    );

    return chain();
  };
}
