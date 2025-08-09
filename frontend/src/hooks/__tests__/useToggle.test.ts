import { renderHook, act } from '@testing-library/react';
import { useToggle, useMultipleToggle, useExpansion } from '../ui/useToggle';

describe('useToggle', () => {
  it('should initialize with default false value', () => {
    const { result } = renderHook(() => useToggle());
    
    const [value, controls] = result.current;
    expect(value).toBe(false);
    expect(typeof controls.toggle).toBe('function');
    expect(typeof controls.setTrue).toBe('function');
    expect(typeof controls.setFalse).toBe('function');
    expect(typeof controls.setValue).toBe('function');
  });

  it('should initialize with provided initial value', () => {
    const { result } = renderHook(() => useToggle(true));
    
    const [value] = result.current;
    expect(value).toBe(true);
  });

  it('should toggle value correctly', () => {
    const { result } = renderHook(() => useToggle(false));
    
    act(() => {
      result.current[1].toggle();
    });
    
    expect(result.current[0]).toBe(true);
    
    act(() => {
      result.current[1].toggle();
    });
    
    expect(result.current[0]).toBe(false);
  });

  it('should set true correctly', () => {
    const { result } = renderHook(() => useToggle(false));
    
    act(() => {
      result.current[1].setTrue();
    });
    
    expect(result.current[0]).toBe(true);
  });

  it('should set false correctly', () => {
    const { result } = renderHook(() => useToggle(true));
    
    act(() => {
      result.current[1].setFalse();
    });
    
    expect(result.current[0]).toBe(false);
  });

  it('should set specific value correctly', () => {
    const { result } = renderHook(() => useToggle());
    
    act(() => {
      result.current[1].setValue(true);
    });
    
    expect(result.current[0]).toBe(true);
    
    act(() => {
      result.current[1].setValue(false);
    });
    
    expect(result.current[0]).toBe(false);
  });
});

describe('useMultipleToggle', () => {
  const initialStates = {
    modal: false,
    sidebar: true,
    dropdown: false
  };

  it('should initialize with provided states', () => {
    const { result } = renderHook(() => useMultipleToggle(initialStates));
    
    expect(result.current.states).toEqual(initialStates);
  });

  it('should toggle specific state', () => {
    const { result } = renderHook(() => useMultipleToggle(initialStates));
    
    act(() => {
      result.current.toggle('modal');
    });
    
    expect(result.current.states.modal).toBe(true);
    expect(result.current.states.sidebar).toBe(true);
    expect(result.current.states.dropdown).toBe(false);
  });

  it('should set specific state', () => {
    const { result } = renderHook(() => useMultipleToggle(initialStates));
    
    act(() => {
      result.current.set('dropdown', true);
    });
    
    expect(result.current.states.dropdown).toBe(true);
    expect(result.current.states.modal).toBe(false);
  });

  it('should set all states', () => {
    const { result } = renderHook(() => useMultipleToggle(initialStates));
    
    act(() => {
      result.current.setAll(true);
    });
    
    expect(result.current.states.modal).toBe(true);
    expect(result.current.states.sidebar).toBe(true);
    expect(result.current.states.dropdown).toBe(true);
  });

  it('should reset to initial states', () => {
    const { result } = renderHook(() => useMultipleToggle(initialStates));
    
    act(() => {
      result.current.setAll(true);
    });
    
    act(() => {
      result.current.reset();
    });
    
    expect(result.current.states).toEqual(initialStates);
  });
});

describe('useExpansion', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with default collapsed state', () => {
    const { result } = renderHook(() => useExpansion());
    
    expect(result.current.isExpanded).toBe(false);
    expect(result.current.isAnimating).toBe(false);
  });

  it('should initialize with provided expanded state', () => {
    const { result } = renderHook(() => useExpansion(true));
    
    expect(result.current.isExpanded).toBe(true);
  });

  it('should toggle with animation', () => {
    const { result } = renderHook(() => useExpansion(false, 300));
    
    act(() => {
      result.current.toggle();
    });
    
    expect(result.current.isExpanded).toBe(true);
    expect(result.current.isAnimating).toBe(true);
    
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    expect(result.current.isAnimating).toBe(false);
  });

  it('should expand with animation', () => {
    const { result } = renderHook(() => useExpansion(false, 200));
    
    act(() => {
      result.current.expand();
    });
    
    expect(result.current.isExpanded).toBe(true);
    expect(result.current.isAnimating).toBe(true);
    
    act(() => {
      jest.advanceTimersByTime(200);
    });
    
    expect(result.current.isAnimating).toBe(false);
  });

  it('should collapse with animation', () => {
    const { result } = renderHook(() => useExpansion(true, 250));
    
    act(() => {
      result.current.collapse();
    });
    
    expect(result.current.isExpanded).toBe(false);
    expect(result.current.isAnimating).toBe(true);
    
    act(() => {
      jest.advanceTimersByTime(250);
    });
    
    expect(result.current.isAnimating).toBe(false);
  });

  it('should not toggle when animating', () => {
    const { result } = renderHook(() => useExpansion(false, 300));
    
    act(() => {
      result.current.toggle();
    });
    
    expect(result.current.isExpanded).toBe(true);
    expect(result.current.isAnimating).toBe(true);
    
    // Try to toggle again while animating
    act(() => {
      result.current.toggle();
    });
    
    // Should still be expanded and animating
    expect(result.current.isExpanded).toBe(true);
    expect(result.current.isAnimating).toBe(true);
  });
});