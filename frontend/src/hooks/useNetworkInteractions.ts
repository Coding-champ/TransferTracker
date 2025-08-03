import { useState, useCallback, useRef, useMemo } from 'react';
import { NetworkNode, NetworkEdge } from '../types';
import * as d3 from 'd3';

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

  // 🔧 FIX: Improved node hover handler with proper isDragging check
  const handleNodeHover = useCallback((node: NetworkNode | null) => {
    // Only update hover state if not currently dragging
    if (!isDraggingRef.current) {
      // Deep clone to prevent mutations affecting the original data
      setSelectedNodeData(node ? { ...node, stats: { ...node.stats } } : null);
    }
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
    if (!isDraggingRef.current) {
      // Deep clone transfers array to prevent mutations
      setHoveredEdgeData(edge ? { 
        ...edge, 
        stats: { ...edge.stats },
        transfers: [...edge.transfers]
      } : null);
    }
  }, []);

  // 🔧 FIX: Enhanced drag start handler
  const handleDragStart = useCallback(() => {
    // Set dragging state immediately
    isDraggingRef.current = true;
    
    // Clear any pending drag end timeout
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
    
    console.log('Drag started - zoom disabled'); // Debug log
  }, []);

  // 🔧 FIX: Enhanced drag end handler with proper timeout management
  const handleDragEnd = useCallback(() => {
    // Use timeout to prevent immediate state changes after drag
    // This prevents flickering when releasing drag AND prevents zoom reset
    dragTimeoutRef.current = setTimeout(() => {
      isDraggingRef.current = false;
      dragTimeoutRef.current = null;
      console.log('Drag ended - zoom re-enabled'); // Debug log
    }, 150); // Increased timeout to ensure drag is fully completed
  }, []);

  // 🔧 FIX: Memoized return object with proper isDragging state
  const returnValue = useMemo(() => ({
    selectedNodeData,
    hoveredEdgeData,
    isDragging: isDraggingRef.current, // Expose current dragging state
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

const createEnhancedZoomBehavior = (isDraggingRef: React.MutableRefObject<boolean>) => {
  return d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.1, 5])
    .filter((event) => {
      // More comprehensive drag detection
      if (isDraggingRef.current) {
        console.log('Zoom blocked - drag in progress');
        return false;
      }
      
      const target = event.target as Element;
      const isNode = target.classList.contains('node') || 
                     target.closest('.node') || 
                     target.closest('.node-group');
      const isEdge = target.classList.contains('link');
      const isControlButton = target.closest('.zoom-controls');
      
      // Allow wheel zoom always
      if (event.type === 'wheel') {
        console.log('Wheel zoom allowed');
        return true;
      }
      
      // Allow pan only on empty space (not nodes, edges, or controls)
      if (event.type === 'mousedown' && !isNode && !isEdge && !isControlButton) {
        console.log('Pan allowed - clicked on empty space');
        return true;
      }
      
      // Block all other interactions
      if (event.type === 'mousedown') {
        console.log(`Zoom/Pan blocked - clicked on ${isNode ? 'node' : isEdge ? 'edge' : 'control'}`);
      }
      
      return false;
    })
    .on('zoom', (event) => {
      // Double-check drag state before applying zoom
      if (!isDraggingRef.current) {
        const zoomGroup = d3.select('.zoom-group');
        if (!zoomGroup.empty()) {
          zoomGroup.attr('transform', event.transform);
          console.log(`Zoom applied: scale=${event.transform.k.toFixed(2)}, translate=(${event.transform.x.toFixed(0)},${event.transform.y.toFixed(0)})`);
        }
      } else {
        console.log('Zoom blocked during drag');
      }
    });
};

// 3. Improved Drag Handler mit besserer State-Verwaltung
const createImprovedDragBehavior = (
  simulation: d3.Simulation<NetworkNode, NetworkEdge>,
  onDragStart: () => void,
  onDragEnd: () => void,
  isDraggingRef: React.MutableRefObject<boolean>
) => {
  return d3.drag<SVGCircleElement, NetworkNode>()
    .on('start', function(event, d) {
      console.log(`Drag start: ${d.name}`);
      
      // Set drag state FIRST
      isDraggingRef.current = true;
      
      // Then call callbacks
      onDragStart();
      
      // Simulation adjustments
      if (!event.active) simulation.alphaTarget(0.3).restart();
      
      // Fix node position
      d.fx = d.x;
      d.fy = d.y;
      
      // Visual feedback
      d3.select(this).attr('stroke-width', 4);
      
      // Prevent event bubbling
      event.sourceEvent.stopPropagation();
    })
    .on('drag', function(event, d) {
      // Update position during drag
      d.fx = event.x;
      d.fy = event.y;
      
      // Optional: Throttle console output
      if (Math.random() < 0.1) { // Only log 10% of drag events
        console.log(`Dragging ${d.name}: (${event.x.toFixed(0)}, ${event.y.toFixed(0)})`);
      }
    })
    .on('end', function(event, d) {
      console.log(`Drag end: ${d.name}`);
      
      // Simulation adjustments
      if (!event.active) simulation.alphaTarget(0);
      
      // Visual feedback
      d3.select(this).attr('stroke-width', 2);
      
      // Call callback
      onDragEnd();
      
      // Reset drag state with longer delay for safety
      setTimeout(() => {
        isDraggingRef.current = false;
        console.log('Drag state reset - zoom re-enabled');
      }, 200); // Increased from 100ms to 200ms for extra safety
      
      // Prevent event bubbling
      event.sourceEvent.stopPropagation();
    });
};

// 4. Debug-Utilities für Troubleshooting
const debugZoomState = (isDraggingRef: React.MutableRefObject<boolean>) => {
  // Call this function in useEffect for debugging
  const interval = setInterval(() => {
    console.log(`Zoom state check - isDragging: ${isDraggingRef.current}`);
  }, 5000); // Check every 5 seconds
  
  return () => clearInterval(interval);
};

// 5. Event Listener für globale Drag-Detection (Optional)
const setupGlobalDragDetection = (isDraggingRef: React.MutableRefObject<boolean>) => {
  const handleGlobalMouseUp = () => {
    if (isDraggingRef.current) {
      console.log('Global mouse up detected - resetting drag state');
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 100);
    }
  };
  
  const handleGlobalMouseLeave = () => {
    if (isDraggingRef.current) {
      console.log('Mouse left window during drag - resetting drag state');
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 100);
    }
  };
  
  document.addEventListener('mouseup', handleGlobalMouseUp);
  document.addEventListener('mouseleave', handleGlobalMouseLeave);
  
  return () => {
    document.removeEventListener('mouseup', handleGlobalMouseUp);
    document.removeEventListener('mouseleave', handleGlobalMouseLeave);
  };
};

export {
  createEnhancedZoomBehavior,
  createImprovedDragBehavior,
  debugZoomState,
  setupGlobalDragDetection
};