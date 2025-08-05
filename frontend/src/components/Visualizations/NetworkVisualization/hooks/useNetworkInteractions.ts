import { useState, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { NetworkNode, NetworkEdge } from '../../../../types';

/**
 * Enhanced hook for managing user interactions with the network visualization
 */
export const useNetworkInteractions = () => {
  // Refs to track state without causing re-renders
  const isDraggingRef = useRef<boolean>(false);
  const selectedNodeRef = useRef<NetworkNode | null>(null);
  const hoveredEdgeRef = useRef<NetworkEdge | null>(null);
  const timeoutRef = useRef<number | null>(null);

  // State for components that need to re-render on changes
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<NetworkEdge | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  /**
   * Create drag behavior for network nodes
   */
  const createDragBehavior = useCallback((
    simulation: d3.Simulation<NetworkNode, NetworkEdge>,
    options: {
      onDragStart?: (node: NetworkNode) => void;
      onDragEnd?: (node: NetworkNode) => void;
      onNodeClick?: (node: NetworkNode) => void;
    } = {}
  ) => {
    const { onDragStart, onDragEnd, onNodeClick } = options;
    
    // Store the initial position to detect clicks vs. drags
    let startX = 0;
    let startY = 0;
    const clickThreshold = 3; // px movement to consider a drag vs. click
    let isDragged = false;

    return d3.drag<SVGCircleElement, NetworkNode>()
      .on('start', function(event, node) {
        // Cancel any existing timeout
        if (timeoutRef.current !== null) {
          window.clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        
        // Set dragging state
        isDraggingRef.current = true;
        setIsDragging(true);
        
        // Store initial position for click detection
        startX = event.x;
        startY = event.y;
        isDragged = false;
        
        // Reheat simulation
        if (!event.active) {
          simulation.alphaTarget(0.3).restart();
        }
        
        // Fix node position while dragging
        node.fx = node.x;
        node.fy = node.y;
        
        // Optional callback
        if (onDragStart) onDragStart(node);
      })
      .on('drag', function(event, node) {
        // Update node position
        node.fx = event.x;
        node.fy = event.y;
        
        // Check if this is a drag (beyond threshold) or potentially still a click
        if (Math.abs(event.x - startX) > clickThreshold || 
            Math.abs(event.y - startY) > clickThreshold) {
          isDragged = true;
        }
      })
      .on('end', function(event, node) {
        // Handle click if it wasn't a significant drag
        if (!isDragged && onNodeClick) {
          onNodeClick(node);
        }
        
        // Allow simulation to cool down naturally
        if (!event.active) {
          simulation.alphaTarget(0);
        }
        
        // Optional callback
        if (onDragEnd) onDragEnd(node);
        
        // Delay resetting drag state to prevent immediate hover effects
        timeoutRef.current = window.setTimeout(() => {
          isDraggingRef.current = false;
          setIsDragging(false);
          timeoutRef.current = null;
        }, 100);
      });
  }, []);

  /**
   * Handle node hover
   */
  const handleNodeHover = useCallback((node: NetworkNode | null) => {
    if (!isDraggingRef.current) {
      selectedNodeRef.current = node;
      setSelectedNode(node);
    }
  }, []);

  /**
   * Handle node click
   */
  const handleNodeClick = useCallback((node: NetworkNode) => {
    if (!isDraggingRef.current) {
      const isCurrentlySelected = 
        selectedNodeRef.current && selectedNodeRef.current.id === node.id;
      
      // Toggle selection
      if (isCurrentlySelected) {
        selectedNodeRef.current = null;
        setSelectedNode(null);
      } else {
        selectedNodeRef.current = node;
        setSelectedNode(node);
      }
    }
  }, []);

  /**
   * Pin or unpin a node at its current position
   */
  const toggleNodePin = useCallback((node: NetworkNode) => {
    const isCurrentlyPinned = node.fx !== null && node.fy !== null;
    
    if (isCurrentlyPinned) {
      // Unpin node
      node.fx = null;
      node.fy = null;
      return false;
    } else {
      // Pin node at current position
      node.fx = node.x;
      node.fy = node.y;
      return true;
    }
  }, []);

  /**
   * Handle edge hover
   */
  const handleEdgeHover = useCallback((edge: NetworkEdge | null) => {
    if (!isDraggingRef.current) {
      hoveredEdgeRef.current = edge;
      setHoveredEdge(edge);
    }
  }, []);

  /**
   * Manually set dragging state (useful for other interactions)
   */
  const setDraggingState = useCallback((dragging: boolean) => {
    isDraggingRef.current = dragging;
    setIsDragging(dragging);
  }, []);

  return {
    // State
    isDragging,
    isDraggingRef,
    selectedNode,
    hoveredEdge,
    
    // Functions
    createDragBehavior,
    handleNodeHover,
    handleNodeClick,
    handleEdgeHover,
    toggleNodePin,
    setDraggingState
  };
};