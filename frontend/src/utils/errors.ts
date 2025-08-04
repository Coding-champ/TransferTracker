/**
 * Specific error classes for better error handling and differentiation
 */

export class ApiError extends Error {
  public readonly status?: number;
  public readonly details?: string;

  constructor(message: string, status?: number, details?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export class ApiTimeoutError extends ApiError {
  constructor(message: string = 'Request timed out', details?: string) {
    super(message, 408, details);
    this.name = 'ApiTimeoutError';
  }
}

export class ApiNotFoundError extends ApiError {
  constructor(message: string = 'Resource not found', details?: string) {
    super(message, 404, details);
    this.name = 'ApiNotFoundError';
  }
}

export class NetworkError extends Error {
  public readonly originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message);
    this.name = 'NetworkError';
    this.originalError = originalError;
  }
}

export class ValidationError extends Error {
  public readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Utility function to handle and categorize errors
 */
export const handleError = (error: unknown): ApiError => {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof Error) {
    // Check for common error patterns
    if (error.name === 'AbortError') {
      return new ApiTimeoutError('Request was cancelled');
    }

    if (error.message.includes('timeout')) {
      return new ApiTimeoutError(error.message);
    }

    if (error.message.includes('404') || error.message.includes('not found')) {
      return new ApiNotFoundError(error.message);
    }

    if (error.message.includes('network') || error.message.includes('fetch')) {
      return new NetworkError(error.message, error);
    }

    // Default to generic API error
    return new ApiError(error.message);
  }

  // Handle non-Error objects
  return new ApiError('An unknown error occurred', undefined, String(error));
};

/**
 * Type guard to check if error is a specific type
 */
export const isApiTimeoutError = (error: unknown): error is ApiTimeoutError => {
  return error instanceof ApiTimeoutError;
};

export const isApiNotFoundError = (error: unknown): error is ApiNotFoundError => {
  return error instanceof ApiNotFoundError;
};

export const isNetworkError = (error: unknown): error is NetworkError => {
  return error instanceof NetworkError;
};

export const isValidationError = (error: unknown): error is ValidationError => {
  return error instanceof ValidationError;
};