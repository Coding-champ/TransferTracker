import { useState, useCallback, useRef, useMemo } from 'react';
import { NetworkNode, NetworkEdge } from '../types';
import * as d3 from 'd3';

interface UseNetworkInteractionsReturn {
  selectedNodeData: NetworkNode | null;
  hoveredEdgeData: NetworkEdge | null;
  isDragging: boolean;
  isDraggingRef: React.MutableRefObject<boolean>; // 🔧 FIX: Expose isDraggingRef
  setSelectedNodeData: (node: NetworkNode | null) => void;
  setHoveredEdgeData: (edge: NetworkEdge | null) => void;
  handleNodeHover: (node: NetworkNode | null) => void;
  handleNodeClick: (node: NetworkNode, simulation: any) => void;
  handleEdgeHover: (edge: NetworkEdge | null) => void;
  handleDragStart: () => void;
  handleDragEnd: () => void;
  clearSelection: () => void;
}

export const useNetworkInteractions = (): UseNetworkInteractionsReturn => {
  const [selectedNodeData, setSelectedNodeData] = useState<NetworkNode | null>(null);
  const [hoveredEdgeData, setHoveredEdgeData] = useState<NetworkEdge | null>(null);
  const isDraggingRef = useRef(false);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 🔧 FIX: Improved node hover handler - don't interfere with selection during drag
  const handleNodeHover = useCallback((node: NetworkNode | null) => {
    // Only update hover/selection state if not currently dragging
    if (!isDraggingRef.current && node) {
      // Deep clone to prevent mutations affecting the original data
      setSelectedNodeData({ ...node, stats: { ...node.stats } });
    }
  }, []);

  // Optimized clear function
  const clearSelection = useCallback(() => {
    if (!isDraggingRef.current) {
      setSelectedNodeData(null);
      setHoveredEdgeData(null);
    }
  }, []);

  // 🔧 FIX: Enhanced node click handler with proper drag state management
  const enhancedHandleNodeClick = useCallback((node: NetworkNode, simulation: any) => {
    // Prevent click events during or immediately after drag
    if (isDraggingRef.current) {
      console.log('Click suppressed - currently dragging');
      return;
    }
    
    // Add small delay to ensure drag is completely finished
    setTimeout(() => {
      if (!isDraggingRef.current) {
        const isCurrentlyPinned = node.fx !== null && node.fx !== undefined;
        
        if (!isCurrentlyPinned) {
          node.fx = node.x;
          node.fy = node.y;
          console.log(`Node ${node.name} pinned at (${node.x}, ${node.y})`);
        } else {
          node.fx = null;
          node.fy = null;
          console.log(`Node ${node.name} unpinned`);
        }
        
        // Gentle restart of simulation
        simulation.alpha(0.1).restart();
      }
    }, 50);
  }, []);

  // 🔧 FIX: Enhanced edge hover handler with drag state check
  const handleEdgeHover = useCallback((edge: NetworkEdge | null) => {
    // Only update hover state if not currently dragging
    if (!isDraggingRef.current && edge) {
      // Deep clone transfers array to prevent mutations
      setHoveredEdgeData({ 
        ...edge, 
        stats: { ...edge.stats },
        transfers: [...edge.transfers]
      });
    } else if (!edge) {
      setHoveredEdgeData(null);
    }
  }, []);

  // 🔧 FIX: Enhanced drag start handler
  const handleDragStart = useCallback(() => {
    // Set dragging state immediately and clear any pending timeouts
    isDraggingRef.current = true;
    
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
    
    console.log('🎯 Drag started - zoom disabled');
  }, []);

  // 🔧 FIX: Enhanced drag end handler with proper timeout management
  const handleDragEnd = useCallback(() => {
    console.log('🎯 Drag ended - starting timeout...');
    
    // Use timeout to prevent immediate state changes after drag
    // This prevents zoom reset when releasing drag
    dragTimeoutRef.current = setTimeout(() => {
      isDraggingRef.current = false;
      dragTimeoutRef.current = null;
      console.log('🎯 Drag state reset - zoom re-enabled');
    }, 200); // Increased timeout for more stable behavior
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
    isDraggingRef.current = false;
  }, []);

  // 🔧 FIX: Memoized return object with isDraggingRef exposed
  const returnValue = useMemo(() => ({
    selectedNodeData,
    hoveredEdgeData,
    isDragging: isDraggingRef.current,
    isDraggingRef, // 🔧 FIX: Expose the ref for TransferNetwork component
    setSelectedNodeData,
    setHoveredEdgeData,
    handleNodeHover,
    handleNodeClick: enhancedHandleNodeClick,
    handleEdgeHover,
    handleDragStart,
    handleDragEnd,
    clearSelection
  }), [selectedNodeData, hoveredEdgeData, handleNodeHover, enhancedHandleNodeClick, handleEdgeHover, handleDragStart, handleDragEnd, clearSelection]);

  return returnValue;
};