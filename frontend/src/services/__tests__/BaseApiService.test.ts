import { BaseApiService } from '../BaseApiService';
import { ApiResponse } from '../../types';
import { ApiError, NetworkError, TimeoutError, NotFoundError } from '../ApiErrors';
import axios, { AxiosResponse } from 'axios';
import { createPerformanceTimer } from '../../utils';

// Mock the utils module
jest.mock('../../utils', () => ({
  createPerformanceTimer: jest.fn(() => jest.fn()),
  debugLog: jest.fn()
}));

// Mock console.error to avoid noise in test output
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

const mockCreatePerformanceTimer = createPerformanceTimer as jest.MockedFunction<typeof createPerformanceTimer>;

// Create a concrete implementation for testing
class TestApiService extends BaseApiService {
  async testMethod(): Promise<ApiResponse<string>> {
    return this.execute(
      () => Promise.resolve({
        data: { success: true, data: 'test data' }
      } as AxiosResponse<ApiResponse<string>>),
      'Test Method'
    );
  }

  async testMethodWithCache(): Promise<ApiResponse<string>> {
    return this.execute(
      () => Promise.resolve({
        data: { success: true, data: 'cached data' }
      } as AxiosResponse<ApiResponse<string>>),
      'Test Method With Cache',
      { useCache: true, cacheKey: 'test-key', cacheTTL: 1000 }
    );
  }

  async testMethodWithError(): Promise<ApiResponse<string>> {
    const error = new Error('Network error');
    (error as any).request = {};
    return this.execute(
      () => Promise.reject(error),
      'Test Method With Error'
    );
  }

  async testMethodWith404Error(): Promise<ApiResponse<string>> {
    const error = new Error('Not found');
    (error as any).response = {
      status: 404,
      data: { error: 'Resource not found' }
    };
    (error as any).config = { url: '/test-endpoint' };
    return this.execute(
      () => Promise.reject(error),
      'Test Method With 404'
    );
  }
}

describe('BaseApiService', () => {
  let service: TestApiService;

  beforeEach(() => {
    service = new TestApiService();
    consoleErrorSpy.mockClear();
    mockCreatePerformanceTimer.mockReturnValue(jest.fn());
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('execute method', () => {
    it('should execute operation and return result', async () => {
      const result = await service.testMethod();
      expect(result.success).toBe(true);
      expect(result.data).toBe('test data');
    });

    it('should handle caching correctly', async () => {
      // First call - should execute operation
      const result1 = await service.testMethodWithCache();
      expect(result1.data).toBe('cached data');

      // Second call - should return cached data
      const result2 = await service.testMethodWithCache();
      expect(result2.data).toBe('cached data');
    });

    it('should handle network errors correctly', async () => {
      await expect(service.testMethodWithError()).rejects.toThrow(NetworkError);
    });

    it('should handle 404 errors correctly', async () => {
      await expect(service.testMethodWith404Error()).rejects.toThrow(NotFoundError);
    });
  });

  describe('cache management', () => {
    it('should clear specific cache entry', () => {
      // Set cache entry
      service['setCache']('test-key', { success: true, data: 'test' }, 1000);
      
      // Verify it exists
      const cached = service['getFromCache']('test-key');
      expect(cached).toBeTruthy();
      
      // Clear specific entry
      service.clearCache('test-key');
      
      // Verify it's gone
      const clearedCache = service['getFromCache']('test-key');
      expect(clearedCache).toBeNull();
    });

    it('should clear all cache', () => {
      // Set multiple cache entries
      service['setCache']('key1', { success: true, data: 'test1' }, 1000);
      service['setCache']('key2', { success: true, data: 'test2' }, 1000);
      
      // Clear all
      service.clearCache();
      
      // Verify all are gone
      expect(service['getFromCache']('key1')).toBeNull();
      expect(service['getFromCache']('key2')).toBeNull();
    });

    it('should handle cache expiration', async () => {
      // Set cache with very short TTL
      service['setCache']('expire-key', { success: true, data: 'expire-test' }, 1);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 5));
      
      // Should return null due to expiration
      const expired = service['getFromCache']('expire-key');
      expect(expired).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should create proper error types based on status code', () => {
      const context = 'Test Context';

      // Test 404 error
      const error404 = { response: { status: 404, data: {} }, config: { url: '/test' } };
      const notFoundError = service['handleApiError'](error404, context);
      expect(notFoundError).toBeInstanceOf(NotFoundError);

      // Test timeout error
      const timeoutError = { request: {}, code: 'ECONNABORTED' };
      const timeout = service['handleApiError'](timeoutError, context);
      expect(timeout).toBeInstanceOf(TimeoutError);

      // Test network error
      const networkError = { request: {} };
      const network = service['handleApiError'](networkError, context);
      expect(network).toBeInstanceOf(NetworkError);

      // Test generic error
      const genericError = { message: 'Generic error' };
      const generic = service['handleApiError'](genericError, context);
      expect(generic).toBeInstanceOf(ApiError);
    });
  });
});