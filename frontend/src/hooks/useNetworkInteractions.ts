import { useState, useCallback, useRef, useMemo } from 'react';
import { NetworkNode, NetworkEdge } from '../types';

interface UseNetworkInteractionsReturn {
  selectedNodeData: NetworkNode | null;
  hoveredEdgeData: NetworkEdge | null;
  isDragging: boolean;
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

  // Memoized handlers to prevent unnecessary re-renders
  const handleNodeHover = useCallback((node: NetworkNode | null) => {
    if (!isDraggingRef.current) {
      // Deep clone to prevent mutations affecting the original data
      setSelectedNodeData(node ? { ...node, stats: { ...node.stats } } : null);
    }
  }, []);

  const handleNodeClick = useCallback((node: NetworkNode, simulation: any) => {
    if (!isDraggingRef.current) {
      // Toggle pin/unpin functionality with optimized state changes
      const isCurrentlyPinned = node.fx !== null && node.fx !== undefined;
      
      if (!isCurrentlyPinned) {
        node.fx = node.x;
        node.fy = node.y;
      } else {
        node.fx = null;
        node.fy = null;
      }
      
      // Restart simulation with minimal alpha for smooth animation
      simulation.alpha(0.1).restart();
    }
  }, []);

  const handleEdgeHover = useCallback((edge: NetworkEdge | null) => {
    if (!isDraggingRef.current) {
      // Deep clone transfers array to prevent mutations
      setHoveredEdgeData(edge ? { 
        ...edge, 
        stats: { ...edge.stats },
        transfers: [...edge.transfers]
      } : null);
    }
  }, []);

  const handleDragStart = useCallback(() => {
    isDraggingRef.current = true;
    
    // Clear any pending drag end timeout
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    // Use timeout to prevent immediate state changes after drag
    // This prevents flickering when releasing drag
    dragTimeoutRef.current = setTimeout(() => {
      isDraggingRef.current = false;
      dragTimeoutRef.current = null;
    }, 150);
  }, []);

  // Optimized clear function
  const clearSelection = useCallback(() => {
    setSelectedNodeData(null);
    setHoveredEdgeData(null);
  }, []);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
    isDraggingRef.current = false;
  }, []);

  // Memoized return object to prevent unnecessary re-renders
  const returnValue = useMemo(() => ({
    selectedNodeData,
    hoveredEdgeData,
    isDragging: isDraggingRef.current,
    setSelectedNodeData,
    setHoveredEdgeData,
    handleNodeHover,
    handleNodeClick,
    handleEdgeHover,
    handleDragStart,
    handleDragEnd,
    clearSelection
  }), [selectedNodeData, hoveredEdgeData, handleNodeHover, handleNodeClick, handleEdgeHover, handleDragStart, handleDragEnd, clearSelection]);

  return returnValue;
};