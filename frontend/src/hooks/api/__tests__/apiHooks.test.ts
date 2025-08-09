/**
 * Basic Tests for Phase 4 API Cache and Network Status Hooks
 * 
 * Testing standalone hooks without external dependencies
 */

import { renderHook, act } from '@testing-library/react';
import { useApiCache } from '../useApiCache';
import { useNetworkStatus } from '../useNetworkStatus';
import { useRequestDeduplication } from '../useRequestDeduplication';

describe('Phase 4 API Hooks - Standalone Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useApiCache', () => {
    test('should store and retrieve cached data', () => {
      const { result } = renderHook(() => useApiCache<string>());

      act(() => {
        result.current.set('test-key', 'test-value');
      });

      expect(result.current.get('test-key')).toBe('test-value');
      expect(result.current.has('test-key')).toBe(true);
    });

    test('should handle TTL expiration', () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useApiCache<string>());

      act(() => {
        result.current.set('test-key', 'test-value', 1); // 1ms TTL
      });

      expect(result.current.get('test-key')).toBe('test-value');

      // Fast-forward time past TTL
      act(() => {
        jest.advanceTimersByTime(10);
      });

      expect(result.current.get('test-key')).toBe(null);
      expect(result.current.has('test-key')).toBe(false);
      
      jest.useRealTimers();
    });

    test('should support cache invalidation by tags', () => {
      const { result } = renderHook(() => useApiCache<string>());

      act(() => {
        result.current.set('key1', 'value1', 60000, ['tag1', 'tag2']);
        result.current.set('key2', 'value2', 60000, ['tag2']);
        result.current.set('key3', 'value3', 60000, ['tag3']);
      });

      expect(result.current.get('key1')).toBe('value1');
      expect(result.current.get('key2')).toBe('value2');
      expect(result.current.get('key3')).toBe('value3');

      act(() => {
        const invalidated = result.current.invalidateByTags(['tag2']);
        expect(invalidated).toBe(2); // key1 and key2 should be invalidated
      });

      expect(result.current.get('key1')).toBe(null);
      expect(result.current.get('key2')).toBe(null);
      expect(result.current.get('key3')).toBe('value3');
    });

    test('should provide cache statistics', () => {
      const { result } = renderHook(() => useApiCache<string>());

      act(() => {
        result.current.set('key1', 'value1');
        result.current.set('key2', 'value2');
      });

      const stats = result.current.getStats();
      expect(stats.size).toBe(2);
      expect(stats.status).toBe('healthy');
    });

    test('should support cache cleanup', () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useApiCache<string>());

      act(() => {
        result.current.set('key1', 'value1', 1); // 1ms TTL
        result.current.set('key2', 'value2', 60000); // Long TTL
      });

      // Fast-forward time past TTL for key1
      act(() => {
        jest.advanceTimersByTime(10);
      });

      act(() => {
        const cleaned = result.current.cleanup();
        expect(cleaned).toBe(1); // Only key1 should be cleaned
      });

      expect(result.current.get('key1')).toBe(null);
      expect(result.current.get('key2')).toBe('value2');
      
      jest.useRealTimers();
    });

    test('should remove individual cache entries', () => {
      const { result } = renderHook(() => useApiCache<string>());

      act(() => {
        result.current.set('key1', 'value1');
        result.current.set('key2', 'value2');
      });

      expect(result.current.get('key1')).toBe('value1');
      expect(result.current.get('key2')).toBe('value2');

      act(() => {
        const removed = result.current.remove('key1');
        expect(removed).toBe(true);
      });

      expect(result.current.get('key1')).toBe(null);
      expect(result.current.get('key2')).toBe('value2');
    });

    test('should clear entire cache', () => {
      const { result } = renderHook(() => useApiCache<string>());

      act(() => {
        result.current.set('key1', 'value1');
        result.current.set('key2', 'value2');
      });

      expect(result.current.state.size).toBe(2);

      act(() => {
        result.current.clear();
      });

      expect(result.current.state.size).toBe(0);
      expect(result.current.get('key1')).toBe(null);
      expect(result.current.get('key2')).toBe(null);
    });
  });

  describe('useNetworkStatus', () => {
    test('should provide network status information', () => {
      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current).toHaveProperty('isOnline');
      expect(result.current).toHaveProperty('connectionType');
      expect(result.current).toHaveProperty('quality');
      expect(result.current).toHaveProperty('lastUpdate');
      expect(result.current).toHaveProperty('monitoring');
      expect(typeof result.current.isOnline).toBe('boolean');
      expect(typeof result.current.lastUpdate).toBe('number');
    });

    test('should detect online/offline status', () => {
      const { result } = renderHook(() => useNetworkStatus());

      // Should match navigator.onLine
      expect(result.current.isOnline).toBe(navigator.onLine);
    });

    test('should have valid connection type', () => {
      const { result } = renderHook(() => useNetworkStatus());

      const validTypes = ['slow-2g', '2g', '3g', '4g', '5g', 'wifi', 'ethernet', 'unknown'];
      expect(validTypes).toContain(result.current.connectionType);
    });

    test('should have valid quality assessment', () => {
      const { result } = renderHook(() => useNetworkStatus());

      const validQualities = ['poor', 'good', 'excellent'];
      expect(validQualities).toContain(result.current.quality);
    });
  });

  describe('useRequestDeduplication', () => {
    test('should deduplicate identical requests', async () => {
      const { result } = renderHook(() => useRequestDeduplication());

      const mockRequest = jest.fn().mockResolvedValue('result');
      
      const promise1 = result.current.execute(['test'], mockRequest);
      const promise2 = result.current.execute(['test'], mockRequest);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toBe('result');
      expect(result2).toBe('result');
      expect(mockRequest).toHaveBeenCalledTimes(1); // Should only call once due to deduplication
    });

    test('should generate unique keys for different requests', async () => {
      const { result } = renderHook(() => useRequestDeduplication());

      const mockRequest1 = jest.fn().mockResolvedValue('result1');
      const mockRequest2 = jest.fn().mockResolvedValue('result2');
      
      const promise1 = result.current.execute(['test1'], mockRequest1);
      const promise2 = result.current.execute(['test2'], mockRequest2);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toBe('result1');
      expect(result2).toBe('result2');
      expect(mockRequest1).toHaveBeenCalledTimes(1);
      expect(mockRequest2).toHaveBeenCalledTimes(1);
    });

    test('should provide deduplication statistics', () => {
      const { result } = renderHook(() => useRequestDeduplication());

      const stats = result.current.getStats();
      expect(stats).toHaveProperty('totalRequests');
      expect(stats).toHaveProperty('deduplicatedRequests');
      expect(stats).toHaveProperty('activeRequestsCount');
      expect(typeof stats.totalRequests).toBe('number');
      expect(typeof stats.deduplicatedRequests).toBe('number');
      expect(typeof stats.activeRequestsCount).toBe('number');
    });

    test('should handle request addition and removal', () => {
      const { result } = renderHook(() => useRequestDeduplication());

      const testPromise = Promise.resolve('test');
      
      act(() => {
        result.current.addRequest('test-key', testPromise);
      });
      
      expect(result.current.hasRequest('test-key')).toBe(true);

      act(() => {
        result.current.removeRequest('test-key');
      });

      expect(result.current.hasRequest('test-key')).toBe(false);
    });

    test('should clear all active requests', () => {
      const { result } = renderHook(() => useRequestDeduplication());

      act(() => {
        result.current.addRequest('test-key-1', Promise.resolve('test1'));
        result.current.addRequest('test-key-2', Promise.resolve('test2'));
      });

      expect(result.current.hasRequest('test-key-1')).toBe(true);
      expect(result.current.hasRequest('test-key-2')).toBe(true);

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.hasRequest('test-key-1')).toBe(false);
      expect(result.current.hasRequest('test-key-2')).toBe(false);
    });

    test('should generate keys correctly', () => {
      const { result } = renderHook(() => useRequestDeduplication());

      const key1 = result.current.generateKey('test', 1, true);
      const key2 = result.current.generateKey('test', 1, true);
      const key3 = result.current.generateKey('test', 2, true);

      expect(key1).toBe(key2); // Same arguments should generate same key
      expect(key1).not.toBe(key3); // Different arguments should generate different keys
    });
  });
});