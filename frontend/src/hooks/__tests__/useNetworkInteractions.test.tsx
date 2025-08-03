import { renderHook, act } from '@testing-library/react';
import { useNetworkInteractions } from '../useNetworkInteractions';

describe('useNetworkInteractions Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('initializes with correct default values', () => {
    const { result } = renderHook(() => useNetworkInteractions());

    expect(result.current.isDragging).toBe(false);
    expect(result.current.isDraggingRef.current).toBe(false);
    expect(typeof result.current.handleDragStart).toBe('function');
    expect(typeof result.current.handleDragEnd).toBe('function');
  });

  test('isDraggingRef is properly exposed', () => {
    const { result } = renderHook(() => useNetworkInteractions());

    expect(result.current.isDraggingRef).toBeDefined();
    expect(typeof result.current.isDraggingRef).toBe('object');
    expect(result.current.isDraggingRef.current).toBe(false);
  });

  test('handleDragStart sets isDragging to true immediately', () => {
    const { result } = renderHook(() => useNetworkInteractions());

    act(() => {
      result.current.handleDragStart();
    });

    expect(result.current.isDraggingRef.current).toBe(true);
  });

  test('handleDragEnd sets up timeout for isDragging reset', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useNetworkInteractions());

    // Start drag first
    act(() => {
      result.current.handleDragStart();
    });
    expect(result.current.isDraggingRef.current).toBe(true);

    // End drag
    act(() => {
      result.current.handleDragEnd();
    });

    // Should still be true immediately after drag end
    expect(result.current.isDraggingRef.current).toBe(true);

    // Fast-forward time by 100ms (the timeout duration)
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Should now be false
    expect(result.current.isDraggingRef.current).toBe(false);

    jest.useRealTimers();
  });

  test('multiple drag start calls clear previous timeouts', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useNetworkInteractions());

    // Start first drag
    act(() => {
      result.current.handleDragStart();
    });

    // End first drag
    act(() => {
      result.current.handleDragEnd();
    });

    // Start second drag immediately (should clear the timeout from first drag)
    act(() => {
      result.current.handleDragStart();
    });

    // Wait 100ms - should still be dragging because second drag cleared the timeout
    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current.isDraggingRef.current).toBe(true);

    jest.useRealTimers();
  });

  test('maintains consistent reference identity', () => {
    const { result, rerender } = renderHook(() => useNetworkInteractions());

    const initialHandleDragStart = result.current.handleDragStart;
    const initialHandleDragEnd = result.current.handleDragEnd;
    const initialIsDraggingRef = result.current.isDraggingRef;

    rerender();

    // Functions should maintain reference equality
    expect(result.current.handleDragStart).toBe(initialHandleDragStart);
    expect(result.current.handleDragEnd).toBe(initialHandleDragEnd);
    expect(result.current.isDraggingRef).toBe(initialIsDraggingRef);
  });
});