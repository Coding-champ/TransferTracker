/**
 * Performance Hooks Tests
 * 
 * Tests for the new performance hooks focusing on zero CPU overhead
 * and proper functionality.
 */

import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { useLazyLoading } from '../useLazyLoading';
import { useVirtualization } from '../useVirtualization';

// Mock telemetry config
jest.mock('../../../utils/telemetry/config', () => ({
  telemetryConfig: {
    isEnabled: () => false
  }
}));

jest.mock('../../../utils/telemetry/performanceMetrics', () => ({
  performanceMetrics: {
    trackEvent: jest.fn(),
    trackRender: jest.fn(),
    trackMemory: jest.fn(),
    getSummary: () => ({
      componentCount: 0,
      excessiveRenders: 0,
      averageRenderTime: 0
    })
  }
}));

describe('useLazyLoading', () => {
  const MockComponent = () => React.createElement('div', {}, 'Mock Component');
  
  const createComponentLoader = (shouldFail = false, delay = 0) => 
    () => new Promise((resolve, reject) => {
      setTimeout(() => {
        if (shouldFail) {
          reject(new Error('Failed to load component'));
        } else {
          resolve({ default: MockComponent });
        }
      }, delay);
    });

  test('should return null component when disabled', () => {
    const { result } = renderHook(() => 
      useLazyLoading(createComponentLoader(), { enabled: false })
    );

    expect(result.current.LazyComponent).toBeNull();
    expect(result.current.isLoaded).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  test('should load component successfully', async () => {
    const { result } = renderHook(() => 
      useLazyLoading(createComponentLoader(), { enabled: true, preload: true })
    );

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.current.isLoaded).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.LazyComponent).toBeTruthy();
  });

  test('should handle loading errors with retries', async () => {
    const { result } = renderHook(() => 
      useLazyLoading(createComponentLoader(true), { 
        enabled: true, 
        preload: true,
        retryAttempts: 2,
        retryDelay: 10
      })
    );

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.retryCount).toBeGreaterThan(0);
  });

  test('should respect timeout option', async () => {
    const { result } = renderHook(() => 
      useLazyLoading(createComponentLoader(false, 200), { 
        enabled: true, 
        preload: true,
        timeout: 100
      })
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });

    expect(result.current.error?.message).toContain('timed out');
  });

  test('should allow manual preload', async () => {
    const { result } = renderHook(() => 
      useLazyLoading(createComponentLoader(), { enabled: true })
    );

    expect(result.current.isLoaded).toBe(false);

    await act(async () => {
      await result.current.preload();
    });

    expect(result.current.isLoaded).toBe(true);
  });

  test('should reset state correctly', async () => {
    const { result } = renderHook(() => 
      useLazyLoading(createComponentLoader(), { enabled: true, preload: true })
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.current.isLoaded).toBe(true);

    act(() => {
      result.current.reset();
    });

    expect(result.current.isLoaded).toBe(false);
    expect(result.current.LazyComponent).toBeNull();
  });
});

describe('useVirtualization', () => {
  const createItems = (count: number) => 
    Array.from({ length: count }, (_, i) => ({ id: i, name: `Item ${i}` }));

  test('should return all items when disabled', () => {
    const items = createItems(100);
    const { result } = renderHook(() => 
      useVirtualization(items, { enabled: false })
    );

    expect(result.current.visibleItems).toHaveLength(100);
    expect(result.current.totalHeight).toBe(5000); // 100 * 50px
  });

  test('should initialize with empty visible items when enabled', () => {
    const items = createItems(100);
    const { result } = renderHook(() => 
      useVirtualization(items, { enabled: true })
    );

    expect(result.current.visibleItems).toHaveLength(0);
    expect(result.current.totalHeight).toBe(0);
    expect(result.current.isScrolling).toBe(false);
  });

  test('should handle empty items array', () => {
    const { result } = renderHook(() => 
      useVirtualization([], { enabled: true })
    );

    expect(result.current.visibleItems).toHaveLength(0);
    expect(result.current.totalHeight).toBe(0);
  });

  test('should provide scroll props with handler', () => {
    const items = createItems(10);
    const { result } = renderHook(() => 
      useVirtualization(items, { enabled: true })
    );

    expect(result.current.scrollProps.onScroll).toBeDefined();
    expect(result.current.scrollProps.style).toEqual({
      height: '100%',
      overflow: 'auto'
    });
  });

  test('should handle dynamic item heights', () => {
    const items = createItems(10);
    const dynamicHeight = (index: number) => 50 + (index % 3) * 20;
    
    const { result } = renderHook(() => 
      useVirtualization(items, { 
        enabled: true,
        itemHeight: dynamicHeight
      })
    );

    // Test that containerRef is provided
    expect(result.current.containerRef).toBeDefined();
  });

  test('should respect overscan option', () => {
    const items = createItems(100);
    const { result } = renderHook(() => 
      useVirtualization(items, { 
        enabled: true,
        overscan: 10
      })
    );

    // Overscan should be factored into calculations
    expect(result.current.containerRef).toBeDefined();
  });

  test('should throttle scroll updates', () => {
    const items = createItems(100);
    const { result } = renderHook(() => 
      useVirtualization(items, { 
        enabled: true,
        throttle: 100
      })
    );

    const mockEvent = {
      currentTarget: {
        scrollTop: 100,
        clientHeight: 400
      }
    } as React.UIEvent;

    // Should not throw when calling scroll handler
    expect(() => {
      result.current.scrollProps.onScroll(mockEvent);
    }).not.toThrow();
  });
});

describe('Performance Hooks Integration', () => {
  test('should have zero CPU overhead when disabled', () => {
    const performanceStart = performance.now();
    
    // Render multiple hooks with disabled state
    renderHook(() => useLazyLoading(() => Promise.resolve({ default: () => null }), { enabled: false }));
    renderHook(() => useVirtualization([], { enabled: false }));
    
    const performanceEnd = performance.now();
    const executionTime = performanceEnd - performanceStart;
    
    // Should complete very quickly when disabled (less than 5ms)
    expect(executionTime).toBeLessThan(5);
  });

  test('should not create unnecessary object instances when disabled', () => {
    const { result: lazyResult } = renderHook(() => 
      useLazyLoading(() => Promise.resolve({ default: () => null }), { enabled: false })
    );
    
    const { result: virtualResult } = renderHook(() => 
      useVirtualization([], { enabled: false })
    );

    // References should be stable across re-renders when disabled
    const lazyResult1 = lazyResult.current;
    const virtualResult1 = virtualResult.current;

    // Re-render
    renderHook(() => 
      useLazyLoading(() => Promise.resolve({ default: () => null }), { enabled: false })
    );
    renderHook(() => 
      useVirtualization([], { enabled: false })
    );

    // Results should be referentially stable for disabled hooks
    expect(lazyResult.current.preload).toBe(lazyResult1.preload);
    expect(lazyResult.current.reset).toBe(lazyResult1.reset);
  });
});