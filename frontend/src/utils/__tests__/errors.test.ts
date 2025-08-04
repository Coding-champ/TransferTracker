import {
  ApiError,
  ApiTimeoutError,
  ApiNotFoundError,
  NetworkError,
  ValidationError,
  handleError,
  isApiTimeoutError,
  isApiNotFoundError,
  isNetworkError,
  isValidationError,
} from '../errors';

describe('Error Classes', () => {
  describe('ApiError', () => {
    it('should create an ApiError with message, status, and details', () => {
      const error = new ApiError('Test error', 500, 'Server details');
      
      expect(error.name).toBe('ApiError');
      expect(error.message).toBe('Test error');
      expect(error.status).toBe(500);
      expect(error.details).toBe('Server details');
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('ApiTimeoutError', () => {
    it('should create a timeout error with default message', () => {
      const error = new ApiTimeoutError();
      
      expect(error.name).toBe('ApiTimeoutError');
      expect(error.message).toBe('Request timed out');
      expect(error.status).toBe(408);
    });

    it('should create a timeout error with custom message', () => {
      const error = new ApiTimeoutError('Custom timeout', 'Network slow');
      
      expect(error.name).toBe('ApiTimeoutError');
      expect(error.message).toBe('Custom timeout');
      expect(error.details).toBe('Network slow');
    });
  });

  describe('ApiNotFoundError', () => {
    it('should create a not found error with default message', () => {
      const error = new ApiNotFoundError();
      
      expect(error.name).toBe('ApiNotFoundError');
      expect(error.message).toBe('Resource not found');
      expect(error.status).toBe(404);
    });
  });

  describe('NetworkError', () => {
    it('should create a network error with original error', () => {
      const originalError = new Error('Connection failed');
      const error = new NetworkError('Network issue', originalError);
      
      expect(error.name).toBe('NetworkError');
      expect(error.message).toBe('Network issue');
      expect(error.originalError).toBe(originalError);
    });
  });

  describe('ValidationError', () => {
    it('should create a validation error with field', () => {
      const error = new ValidationError('Invalid input', 'username');
      
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Invalid input');
      expect(error.field).toBe('username');
    });
  });
});

describe('handleError function', () => {
  it('should return existing ApiError unchanged', () => {
    const originalError = new ApiTimeoutError('Test timeout');
    const result = handleError(originalError);
    
    expect(result).toBe(originalError);
  });

  it('should convert AbortError to ApiTimeoutError', () => {
    const abortError = new Error('Operation was aborted');
    abortError.name = 'AbortError';
    
    const result = handleError(abortError);
    
    expect(result).toBeInstanceOf(ApiTimeoutError);
    expect(result.message).toBe('Request was cancelled');
  });

  it('should convert timeout error to ApiTimeoutError', () => {
    const timeoutError = new Error('Request timeout occurred');
    
    const result = handleError(timeoutError);
    
    expect(result).toBeInstanceOf(ApiTimeoutError);
    expect(result.message).toBe('Request timeout occurred');
  });

  it('should convert 404 error to ApiNotFoundError', () => {
    const notFoundError = new Error('404 not found');
    
    const result = handleError(notFoundError);
    
    expect(result).toBeInstanceOf(ApiNotFoundError);
    expect(result.message).toBe('404 not found');
  });

  it('should convert network error to NetworkError', () => {
    const networkError = new Error('fetch failed');
    
    const result = handleError(networkError);
    
    expect(result).toBeInstanceOf(NetworkError);
    expect(result.message).toBe('fetch failed');
  });

  it('should convert generic Error to ApiError', () => {
    const genericError = new Error('Something went wrong');
    
    const result = handleError(genericError);
    
    expect(result).toBeInstanceOf(ApiError);
    expect(result.message).toBe('Something went wrong');
  });

  it('should handle non-Error objects', () => {
    const result = handleError('String error');
    
    expect(result).toBeInstanceOf(ApiError);
    expect(result.message).toBe('An unknown error occurred');
    expect(result.details).toBe('String error');
  });

  it('should handle null and undefined', () => {
    const resultNull = handleError(null);
    const resultUndefined = handleError(undefined);
    
    expect(resultNull).toBeInstanceOf(ApiError);
    expect(resultUndefined).toBeInstanceOf(ApiError);
  });
});

describe('Type guards', () => {
  describe('isApiTimeoutError', () => {
    it('should return true for ApiTimeoutError instances', () => {
      const timeoutError = new ApiTimeoutError();
      expect(isApiTimeoutError(timeoutError)).toBe(true);
    });

    it('should return false for other error types', () => {
      const apiError = new ApiError('Test');
      const notFoundError = new ApiNotFoundError();
      
      expect(isApiTimeoutError(apiError)).toBe(false);
      expect(isApiTimeoutError(notFoundError)).toBe(false);
      expect(isApiTimeoutError('string')).toBe(false);
      expect(isApiTimeoutError(null)).toBe(false);
    });
  });

  describe('isApiNotFoundError', () => {
    it('should return true for ApiNotFoundError instances', () => {
      const notFoundError = new ApiNotFoundError();
      expect(isApiNotFoundError(notFoundError)).toBe(true);
    });

    it('should return false for other error types', () => {
      const apiError = new ApiError('Test');
      const timeoutError = new ApiTimeoutError();
      
      expect(isApiNotFoundError(apiError)).toBe(false);
      expect(isApiNotFoundError(timeoutError)).toBe(false);
    });
  });

  describe('isNetworkError', () => {
    it('should return true for NetworkError instances', () => {
      const networkError = new NetworkError('Network issue');
      expect(isNetworkError(networkError)).toBe(true);
    });

    it('should return false for other error types', () => {
      const apiError = new ApiError('Test');
      expect(isNetworkError(apiError)).toBe(false);
    });
  });

  describe('isValidationError', () => {
    it('should return true for ValidationError instances', () => {
      const validationError = new ValidationError('Invalid field');
      expect(isValidationError(validationError)).toBe(true);
    });

    it('should return false for other error types', () => {
      const apiError = new ApiError('Test');
      expect(isValidationError(apiError)).toBe(false);
    });
  });
});

describe('Error handling edge cases', () => {
  it('should handle errors with no message property', () => {
    const errorLikeObject = { name: 'CustomError' };
    const result = handleError(errorLikeObject);
    
    expect(result).toBeInstanceOf(ApiError);
    expect(result.message).toBe('An unknown error occurred');
  });

  it('should handle complex nested error objects', () => {
    const complexError = {
      response: {
        status: 500,
        data: { error: 'Internal server error' }
      }
    };
    
    const result = handleError(complexError);
    
    expect(result).toBeInstanceOf(ApiError);
    expect(result.details).toContain('Object');
  });
});