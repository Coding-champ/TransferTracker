import { useState, useCallback } from 'react';

/**
 * Custom hook for managing boolean toggle state
 * 
 * Provides a simple interface for toggling boolean values with additional utility functions.
 * 
 * @param initialValue - Initial boolean value (default: false)
 * @returns Tuple with current value and control functions
 * 
 * @example
 * ```typescript
 * const [isOpen, { toggle, setTrue, setFalse, setValue }] = useToggle();
 * const [isVisible, { toggle: toggleVisibility }] = useToggle(true);
 * 
 * return (
 *   <div>
 *     <button onClick={toggle}>Toggle Modal</button>
 *     <button onClick={setTrue}>Show Modal</button>
 *     <button onClick={setFalse}>Hide Modal</button>
 *     {isOpen && <Modal onClose={setFalse} />}
 *   </div>
 * );
 * ```
 */
export function useToggle(initialValue: boolean = false): [
  boolean,
  {
    toggle: () => void;
    setTrue: () => void;
    setFalse: () => void;
    setValue: (value: boolean) => void;
  }
] {
  const [value, setValue] = useState<boolean>(initialValue);

  const toggle = useCallback(() => {
    setValue(prev => !prev);
  }, []);

  const setTrue = useCallback(() => {
    setValue(true);
  }, []);

  const setFalse = useCallback(() => {
    setValue(false);
  }, []);

  const setValueCallback = useCallback((newValue: boolean) => {
    setValue(newValue);
  }, []);

  return [
    value,
    {
      toggle,
      setTrue,
      setFalse,
      setValue: setValueCallback
    }
  ];
}

/**
 * Hook for managing multiple toggle states
 * 
 * @param initialStates - Object with initial boolean states
 * @returns Object with current states and toggle functions
 */
export function useMultipleToggle<T extends Record<string, boolean>>(
  initialStates: T
): {
  states: T;
  toggle: (key: keyof T) => void;
  set: (key: keyof T, value: boolean) => void;
  setAll: (value: boolean) => void;
  reset: () => void;
} {
  const [states, setStates] = useState<T>(initialStates);

  const toggle = useCallback((key: keyof T) => {
    setStates(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }, []);

  const set = useCallback((key: keyof T, value: boolean) => {
    setStates(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const setAll = useCallback((value: boolean) => {
    setStates(prev => {
      const newStates = {} as T;
      Object.keys(prev).forEach(key => {
        newStates[key as keyof T] = value as T[keyof T];
      });
      return newStates;
    });
  }, []);

  const reset = useCallback(() => {
    setStates(initialStates);
  }, [initialStates]);

  return {
    states,
    toggle,
    set,
    setAll,
    reset
  };
}

/**
 * Hook for managing expandable/collapsible sections
 * 
 * @param initialExpanded - Whether initially expanded
 * @param animationDuration - Duration for expand/collapse animation
 * @returns Expansion state and controls
 */
export function useExpansion(
  initialExpanded: boolean = false,
  animationDuration: number = 300
) {
  const [isExpanded, { toggle, setTrue: expand, setFalse: collapse, setValue }] = useToggle(initialExpanded);
  const [isAnimating, setIsAnimating] = useState(false);

  const toggleWithAnimation = useCallback(() => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    toggle();
    
    setTimeout(() => {
      setIsAnimating(false);
    }, animationDuration);
  }, [toggle, isAnimating, animationDuration]);

  const expandWithAnimation = useCallback(() => {
    if (isExpanded || isAnimating) return;
    
    setIsAnimating(true);
    expand();
    
    setTimeout(() => {
      setIsAnimating(false);
    }, animationDuration);
  }, [expand, isExpanded, isAnimating, animationDuration]);

  const collapseWithAnimation = useCallback(() => {
    if (!isExpanded || isAnimating) return;
    
    setIsAnimating(true);
    collapse();
    
    setTimeout(() => {
      setIsAnimating(false);
    }, animationDuration);
  }, [collapse, isExpanded, isAnimating, animationDuration]);

  return {
    isExpanded,
    isAnimating,
    toggle: toggleWithAnimation,
    expand: expandWithAnimation,
    collapse: collapseWithAnimation,
    setExpanded: setValue
  };
}