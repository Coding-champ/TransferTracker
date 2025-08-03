import { useCallback, useRef, useMemo } from 'react';

interface UseNetworkInteractionsReturn {
  isDragging: boolean;
  isDraggingRef: React.MutableRefObject<boolean>; // Expose isDraggingRef
  handleDragStart: () => void;
  handleDragEnd: () => void;
}

export const useNetworkInteractions = (): UseNetworkInteractionsReturn => {
  const isDraggingRef = useRef(false);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced drag start handler
  const handleDragStart = useCallback(() => {
    // Set dragging state immediately and clear any pending timeouts
    isDraggingRef.current = true;
    
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
    
    console.log('🎯 Drag started - zoom disabled');
  }, []);

  // Enhanced drag end handler with proper timeout management
  const handleDragEnd = useCallback(() => {
    console.log('🎯 Drag ended - starting timeout...');
    
    // Use timeout to prevent immediate state changes after drag
    // This prevents zoom reset when releasing drag
    dragTimeoutRef.current = setTimeout(() => {
      isDraggingRef.current = false;
      dragTimeoutRef.current = null;
      console.log('🎯 Drag state reset - zoom re-enabled');
    }, 100); // Timeout matches reference implementation for consistent behavior
  }, []);

  // Memoized return object with isDraggingRef exposed
  const returnValue = useMemo(() => ({
    isDragging: isDraggingRef.current,
    isDraggingRef, // Expose the ref for components
    handleDragStart,
    handleDragEnd
  }), [handleDragStart, handleDragEnd]);

  return returnValue;
};