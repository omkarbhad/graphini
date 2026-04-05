/**
 * Server-side validation utilities
 */

export interface ValidationError {
  field?: string;
  message: string;
  code?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  sanitized?: {
    message: string;
    mode?: string;
    model?: string;
    userId?: string;
    conversationId?: string;
    currentDiagram?: string;
  };
}

export interface ChatRequest {
  message: string;
  mode?: string;
  model?: string;
  userId?: string;
  conversationId?: string;
}

/**
 * Validates a chat request
 */
export function validateChatRequest(body: any, isDev: boolean = false): ValidationResult {
  const errors: ValidationError[] = [];

  // Check if body exists
  if (!body || typeof body !== 'object') {
    errors.push({
      message: 'Request body is required and must be an object',
      code: 'INVALID_BODY'
    });
    return { isValid: false, errors };
  }

  // Validate message
  if (isDev)
    console.log('Validating message field:', {
      message: body.message,
      messageType: typeof body.message,
      messageLength: body.message?.length,
      messageTrimmed: body.message?.trim?.(),
      messageTrimmedLength: body.message?.trim?.()?.length
    });

  if (!body.message || typeof body.message !== 'string') {
    errors.push({
      field: 'message',
      message: 'Message is required and must be a string',
      code: 'INVALID_MESSAGE'
    });
  } else if (body.message.trim().length === 0) {
    errors.push({
      field: 'message',
      message: 'Message cannot be empty',
      code: 'EMPTY_MESSAGE'
    });
  } else if (body.message.length > 10000) {
    errors.push({
      field: 'message',
      message: 'Message is too long (max 10,000 characters)',
      code: 'MESSAGE_TOO_LONG'
    });
  }

  // Validate mode (optional)
  if (body.mode && typeof body.mode !== 'string') {
    errors.push({
      field: 'mode',
      message: 'Mode must be a string',
      code: 'INVALID_MODE'
    });
  }

  // Validate model (optional)
  if (body.model && typeof body.model !== 'string') {
    errors.push({
      field: 'model',
      message: 'Model must be a string',
      code: 'INVALID_MODEL'
    });
  }

  // Validate userId (optional)
  if (body.userId && typeof body.userId !== 'string') {
    errors.push({
      field: 'userId',
      message: 'User ID must be a string',
      code: 'INVALID_USER_ID'
    });
  }

  // Validate conversationId (optional)
  if (body.conversationId && typeof body.conversationId !== 'string') {
    errors.push({
      field: 'conversationId',
      message: 'Conversation ID must be a string',
      code: 'INVALID_CONVERSATION_ID'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized:
      errors.length === 0
        ? {
            message: sanitizeInput(body.message),
            mode: body.mode,
            model: body.model,
            userId: body.userId,
            conversationId: body.conversationId,
            currentDiagram: body.currentDiagram
          }
        : undefined
  };
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(errors: ValidationError[], status: number = 400) {
  return {
    error: {
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors,
      status
    },
    success: false
  };
}

/**
 * Validates a diagram operation request
 */
export function validateDiagramOperation(operation: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!operation || typeof operation !== 'object') {
    errors.push({
      message: 'Diagram operation is required and must be an object',
      code: 'INVALID_OPERATION'
    });
    return { isValid: false, errors };
  }

  const validOperations = ['read', 'create', 'update', 'clear', 'patch'];
  if (!operation.operation || !validOperations.includes(operation.operation)) {
    errors.push({
      field: 'operation',
      message: `Operation must be one of: ${validOperations.join(', ')}`,
      code: 'INVALID_OPERATION_TYPE'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitizes user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validates and sanitizes a string field
 */
export function validateStringField(
  value: any,
  fieldName: string,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    sanitize?: boolean;
  } = {}
): { value?: string; error?: ValidationError } {
  const { required = false, minLength = 0, maxLength = Infinity, sanitize = true } = options;

  // Check if required but missing
  if (required && (value === undefined || value === null)) {
    return {
      error: {
        field: fieldName,
        message: `${fieldName} is required`,
        code: 'REQUIRED_FIELD'
      }
    };
  }

  // If not required and missing, return undefined
  if (!required && (value === undefined || value === null)) {
    return {};
  }

  // Check if it's a string
  if (typeof value !== 'string') {
    return {
      error: {
        field: fieldName,
        message: `${fieldName} must be a string`,
        code: 'INVALID_TYPE'
      }
    };
  }

  let processedValue = value;

  // Sanitize if requested
  if (sanitize) {
    processedValue = sanitizeInput(value);
  }

  // Check length
  if (processedValue.length < minLength) {
    return {
      error: {
        field: fieldName,
        message: `${fieldName} must be at least ${minLength} characters long`,
        code: 'TOO_SHORT'
      }
    };
  }

  if (processedValue.length > maxLength) {
    return {
      error: {
        field: fieldName,
        message: `${fieldName} must be no more than ${maxLength} characters long`,
        code: 'TOO_LONG'
      }
    };
  }

  return { value: processedValue };
}
