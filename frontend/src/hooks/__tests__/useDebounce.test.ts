import { renderHook, act } from '@testing-library/react';
import { useDebounce, useDebouncedCallback, useDebouncedExecutor } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    );

    expect(result.current).toBe('initial');

    // Change value multiple times quickly
    rerender({ value: 'first' });
    rerender({ value: 'second' });
    rerender({ value: 'final' });

    // Value should still be initial
    expect(result.current).toBe('initial');

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Now value should be updated to the final value
    expect(result.current).toBe('final');
  });

  it('should handle leading edge option', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500, { leading: true }),
      { initialProps: { value: 'initial' } }
    );

    expect(result.current).toBe('initial');

    rerender({ value: 'changed' });
    
    // With leading: true, should update immediately
    expect(result.current).toBe('changed');
  });

  it('should handle maxWait option', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 1000, { maxWait: 500 }),
      { initialProps: { value: 'initial' } }
    );

    expect(result.current).toBe('initial');

    // Change value
    rerender({ value: 'change1' });
    
    act(() => {
      jest.advanceTimersByTime(200);
    });
    
    rerender({ value: 'change2' });
    
    act(() => {
      jest.advanceTimersByTime(400); // Total 600ms > maxWait (500ms)
    });

    // Should update due to maxWait being reached
    expect(result.current).toBe('change2');
  });

  it('should handle equality check option', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500, { equalityCheck: true }),
      { initialProps: { value: 'same' } }
    );

    // Change to same value shouldn't trigger timer
    rerender({ value: 'same' });
    
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current).toBe('same');
  });
});

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should debounce callback execution', () => {
    const mockCallback = jest.fn();
    const { result } = renderHook(() => 
      useDebouncedCallback(mockCallback, 500)
    );

    // Call multiple times quickly
    act(() => {
      result.current('arg1');
      result.current('arg2');
      result.current('arg3');
    });

    expect(mockCallback).not.toHaveBeenCalled();

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith('arg3');
  });

  it('should have cancel method', () => {
    const mockCallback = jest.fn();
    const { result } = renderHook(() => 
      useDebouncedCallback(mockCallback, 500)
    );

    act(() => {
      result.current('test');
    });

    act(() => {
      (result.current as any).cancel();
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(mockCallback).not.toHaveBeenCalled();
  });
});

describe('useDebouncedExecutor', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should execute callback after delay', async () => {
    const mockCallback = jest.fn().mockResolvedValue('result');
    const { result } = renderHook(() => 
      useDebouncedExecutor(mockCallback, 500)
    );

    let promise: Promise<any>;
    act(() => {
      promise = result.current.execute('test');
    });

    expect(mockCallback).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await act(async () => {
      const value = await promise;
      expect(value).toBe('result');
    });
    
    expect(mockCallback).toHaveBeenCalledWith('test');
  });

  it('should cancel pending execution', () => {
    const mockCallback = jest.fn();
    const { result } = renderHook(() => 
      useDebouncedExecutor(mockCallback, 500)
    );

    result.current.execute('test');
    
    act(() => {
      result.current.cancel();
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(mockCallback).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(false);
  });
});