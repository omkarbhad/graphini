/**
 * Standardized error response utilities for API endpoints
 */

export interface ApiError {
  error: string;
  message: string;
  code?: string;
  details?: unknown;
  timestamp: string;
  requestId?: string;
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

export interface ApiValidationError extends ApiError {
  error: 'Validation Error';
  details: ValidationErrorDetail[];
}

export interface ApiServerError extends ApiError {
  error: 'Server Error';
  code: 'INTERNAL_ERROR' | 'DATABASE_ERROR' | 'SERVICE_UNAVAILABLE' | 'TIMEOUT';
}

export interface ApiClientError extends ApiError {
  error: 'Client Error';
  code: 'BAD_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'RATE_LIMITED';
}

// Helper to create standardized error responses
export function createApiError(
  type: 'validation' | 'server' | 'client',
  message: string,
  code?: string,
  details?: unknown,
  requestId?: string
): ApiError {
  const baseError = {
    message,
    timestamp: new Date().toISOString(),
    requestId
  };

  switch (type) {
    case 'validation':
      return {
        error: 'Validation Error',
        code: code || 'INVALID_INPUT',
        details: details || [],
        ...baseError
      } as ApiValidationError;

    case 'server':
      return {
        error: 'Server Error',
        code: (code as ApiServerError['code']) || 'INTERNAL_ERROR',
        details,
        ...baseError
      } as ApiServerError;

    case 'client':
      return {
        error: 'Client Error',
        code: (code as ApiClientError['code']) || 'BAD_REQUEST',
        details,
        ...baseError
      } as ApiClientError;

    default:
      return {
        error: 'Unknown Error',
        code: 'UNKNOWN',
        details,
        ...baseError
      };
  }
}

export function createValidationError(
  message: string,
  validationErrors: ValidationErrorDetail[],
  requestId?: string
): ApiValidationError {
  return createApiError(
    'validation',
    message,
    'INVALID_INPUT',
    validationErrors,
    requestId
  ) as ApiValidationError;
}

export function createServerError(
  message: string,
  code: ApiServerError['code'] = 'INTERNAL_ERROR',
  details?: unknown,
  requestId?: string
): ApiServerError {
  return createApiError('server', message, code, details, requestId) as ApiServerError;
}

export function createClientError(
  message: string,
  code: ApiClientError['code'] = 'BAD_REQUEST',
  details?: unknown,
  requestId?: string
): ApiClientError {
  return createApiError('client', message, code, details, requestId) as ApiClientError;
}

// Helper to get request ID from headers or generate one
export function getRequestId(headers: Headers): string {
  return (
    headers.get('x-request-id') || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );
}

// Helper to send error responses with proper status codes
export function sendErrorResponse(error: ApiError, status: number = 500): Response {
  return new Response(JSON.stringify(error), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
}

// Common error responses
export const COMMON_ERRORS = {
  INVALID_JSON: createClientError('Invalid JSON in request body', 'BAD_REQUEST'),
  MISSING_REQUIRED_FIELD: (field: string) =>
    createClientError(`Missing required field: ${field}`, 'BAD_REQUEST'),
  INVALID_UUID: (field: string) =>
    createValidationError(`Invalid UUID format for ${field}`, [
      { field, message: 'Must be a valid UUID', code: 'INVALID_UUID' }
    ]),
  RATE_LIMITED: (retryAfter?: number) =>
    createClientError(
      'Rate limit exceeded',
      'RATE_LIMITED',
      retryAfter ? { retryAfter } : undefined
    ),
  SERVICE_UNAVAILABLE: createServerError('Service temporarily unavailable', 'SERVICE_UNAVAILABLE'),
  DATABASE_ERROR: createServerError('Database operation failed', 'DATABASE_ERROR'),
  INTERNAL_ERROR: createServerError('Internal server error', 'INTERNAL_ERROR'),
  TIMEOUT: createServerError('Request timeout', 'TIMEOUT')
} as const;
