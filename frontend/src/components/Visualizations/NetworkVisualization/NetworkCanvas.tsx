/**
 * NetworkCanvas.tsx
 * Core visualization component for network data
 * 
 * Created: 2025-08-04 20:38:07 UTC
 * Author: Coding-champ
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { NetworkData } from '../../../types';
import { useSimulationControl } from './hooks/useSimulationControl';
import { useZoomControls } from './hooks/useZoomControls';
import { useNetworkInteractions } from './hooks/useNetworkInteractions';
import { createArrowMarkers, createLinks } from './utils/edgeUtils';
import { createNodes, createLabels } from './utils/nodeUtils';
import NetworkControls from './components/NetworkControls';
import { formatCurrency } from '../../../utils';

interface NetworkCanvasProps {
  networkData: NetworkData;
  width?: number;
  height?: number;
  onNodeSelect?: (nodeId: string | null) => void;
  onEdgeSelect?: (edgeId: string | null) => void;
}

/**
 * Main component for rendering the network visualization
 */
const NetworkCanvas: React.FC<NetworkCanvasProps> = ({
  networkData,
  width = 800,
  height = 600,
  onNodeSelect,
  onEdgeSelect
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);
  const [containerSize, setContainerSize] = useState({ width, height });
  
  // Network interactions state
  const {
    selectedNode,
    hoveredEdge,
    isDraggingRef,
    handleNodeHover,
    handleNodeClick,
    handleEdgeHover,
    createDragBehavior,
    toggleNodePin
  } = useNetworkInteractions();
  
  // Simulation control
  const {
    simulationRef,
    createSimulation,
    startSimulation,
    stopSimulation,
    isSimulationRunning
  } = useSimulationControl();
  
  // Zoom controls
  const {
    zoomIn,
    zoomOut,
    resetZoom,
    initializeZoom,
    transformRef
  } = useZoomControls(svgRef);

  // Handle container resizing
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });
    
    resizeObserver.observe(containerRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Initialize and update visualization when data changes
  useEffect(() => {
    if (!svgRef.current || !networkData?.nodes?.length) return;
    
    // Clear previous visualization
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    
    // Create container for zoomable content
    const zoomGroup = svg.append('g').attr('class', 'zoom-group');
    
    // Initialize zoom behavior
    initializeZoom({
      zoomGroup,
      onZoom: (transform) => {
        // Update label visibility based on zoom level
        updateLabelVisibility(transform);
      }
    });
    
    // Create arrow markers for edges
    createArrowMarkers(svg);
    
    // Prepare simulation
    const simulation = createSimulation(
      networkData.nodes,
      networkData.edges,
      containerSize.width,
      containerSize.height,
      {
        chargeStrength: -100,
        linkDistance: 100
      }
    );
    
    // Create edges
    const links = createLinks(zoomGroup, networkData.edges, {
      onEdgeHover: handleEdgeHover,
      isDraggingRef
    });
    
    // Create color scale for nodes
    const colorScale = d3.scaleOrdinal<string>()
      .domain(['Bundesliga', 'Premier League', 'La Liga', 'Serie A', 'Ligue 1', 'Primera División', 'Série A', 'MLS', 'Championship', '2. Bundesliga'])
      .range(['#d70909', '#3d0845', '#ff6b35', '#146441ff', '#1e3a8a','#748ccfff','#4f895fff', '#cf4e84ff', '#696c74ff', '#a30e0eff']);
    
    // Create nodes
    const { nodes, nodeCircles } = createNodes(zoomGroup, networkData.nodes, {
      colorScale,
      onNodeHover: handleNodeHover,
      onNodeClick: (node) => {
        handleNodeClick(node);
        if (onNodeSelect) onNodeSelect(node.id);
      },
      isDraggingRef
    });
    
    // Create node labels
    const { labels, roiLabels, labelOffsetY, roiOffsetY } = createLabels(zoomGroup, networkData.nodes);
    
    // Create drag behavior
    const dragBehavior = createDragBehavior(simulation, {
      onNodeClick: (node) => {
        // Toggle pin state on click
        toggleNodePin(node);
        
        // Update pin indicator
        nodes.selectAll('.pin-indicator')
          .filter((d: any) => d.id === node.id)
          .style('opacity', function(d: any) { 
            return (d.fx !== null && d.fy !== null) ? 1 : 0;
          });
        
        // Restart simulation
        startSimulation(0.2);
      }
    });
    
    // Apply drag behavior to nodes
    nodeCircles.call(dragBehavior as any);
    
    // Setup simulation tick handler
    simulation.on('tick', () => {
      // Update edge positions (FIX: correct function call with proper type)
      links.attr('x1', d => (d.source as any).x)
          .attr('y1', d => (d.source as any).y)
          .attr('x2', d => (d.target as any).x)
          .attr('y2', d => (d.target as any).y);
      
      // Update node and label positions (labels kept hidden for cleaner visualization)
      nodes.attr('transform', d => `translate(${d.x},${d.y})`);
      
      // Keep labels hidden for cleaner visualization regardless of zoom level
      labels
        .attr('x', d => d.x!)
        .attr('y', d => d.y! + labelOffsetY)
        .style('display', 'none'); // Keep labels hidden for cleaner visualization
      
      roiLabels
        .attr('x', d => d.x!)
        .attr('y', d => d.y! + roiOffsetY)
        .style('display', 'none'); // Keep ROI labels hidden for cleaner visualization
    });
    
    // Auto-stop simulation after initial stabilization - FIXED: storing timeout reference
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = window.setTimeout(() => {
      stopSimulation();
      timeoutRef.current = null;
    }, 3000);
    
    // Function to update label visibility based on zoom level
    function updateLabelVisibility(transform: d3.ZoomTransform) {
      // Keep labels hidden for cleaner visualization regardless of zoom level
      labels.style('display', 'none');
      roiLabels.style('display', 'none');
    }
    
    // Cleanup function
    return () => {
      if (simulation) {
        simulation.stop();
      }
      
      // Clean up timeout on unmount
      const currentTimeout = timeoutRef.current;
      if (currentTimeout) {
        clearTimeout(currentTimeout);
        timeoutRef.current = null;
      }
    };
  }, [
    networkData, 
    containerSize, 
    createSimulation, 
    initializeZoom,
    handleNodeHover, 
    handleNodeClick, 
    handleEdgeHover, 
    createDragBehavior, 
    toggleNodePin,
    simulationRef,
    startSimulation,
    stopSimulation,
    transformRef,
    isDraggingRef,
    onNodeSelect
  ]);
  
  // Effect to update edge selection in parent component
  useEffect(() => {
    if (onEdgeSelect && hoveredEdge) {
      onEdgeSelect(hoveredEdge.id);
    } else if (onEdgeSelect && !hoveredEdge) {
      onEdgeSelect(null);
    }
  }, [hoveredEdge, onEdgeSelect]);

  // Handlers for control buttons
  const handleStartSimulation = useCallback(() => {
    startSimulation(0.3);
  }, [startSimulation]);
  
  const handleStopSimulation = useCallback(() => {
    stopSimulation();
  }, [stopSimulation]);

  return (
    <div 
      ref={containerRef} 
      className="relative bg-gray-50 border border-gray-200 rounded-lg overflow-hidden"
      style={{ width: '100%', height }}
    >
      <svg 
        ref={svgRef} 
        width={containerSize.width} 
        height={containerSize.height}
        className="w-full h-full"
      >
        {/* D3 will render here */}
      </svg>
      
      {/* Control buttons */}
      <NetworkControls
        onZoomIn={() => zoomIn()}
        onZoomOut={() => zoomOut()}
        onResetZoom={() => resetZoom()}
        onStartSimulation={handleStartSimulation}
        onStopSimulation={handleStopSimulation}
        isSimulationRunning={isSimulationRunning()}
      />
      
      {/* Node info overlay */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg max-w-xs">
          <h3 className="text-sm font-semibold">{selectedNode.name}</h3>
          <p className="text-xs text-gray-600">{selectedNode.league}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs">
            <div>Transfers In: <span className="font-medium">{selectedNode.stats.transfersIn}</span></div>
            <div>Transfers Out: <span className="font-medium">{selectedNode.stats.transfersOut}</span></div>
            {selectedNode.stats.netSpend !== undefined && (
              <div className="col-span-2">
                Net Spend: <span className={`font-medium ${selectedNode.stats.netSpend > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  €{Math.abs(selectedNode.stats.netSpend).toLocaleString()}
                  {selectedNode.stats.netSpend > 0 ? ' (-)' : ' (+)'}
                </span>
              </div>
            )}
            {selectedNode.stats.avgROI !== undefined && (
              <div className="col-span-2">
                Avg ROI: <span className={`font-medium ${selectedNode.stats.avgROI > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {selectedNode.stats.avgROI.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Edge info overlay */}
      {hoveredEdge && (
        <div className="absolute bottom-4 right-4 bg-white p-3 rounded-lg shadow-lg max-w-xs">
          <h3 className="text-sm font-semibold">Transfer Connection</h3>
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>{typeof hoveredEdge.source === 'string' ? hoveredEdge.source : hoveredEdge.source.name}</span>
            <span className="mx-2">→</span>
            <span>{typeof hoveredEdge.target === 'string' ? hoveredEdge.target : hoveredEdge.target.name}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs">
            <div>Transfers: <span className="font-medium">{hoveredEdge.stats.transferCount}</span></div>
            <div>Value: <span className="font-medium">€{hoveredEdge.stats.totalValue.toLocaleString()}</span></div>
            <div>Type: <span className="font-medium">{hoveredEdge.stats.types}</span></div>
            <div>Window: <span className="font-medium">{hoveredEdge.stats.transferWindows}</span></div>
            {hoveredEdge.stats.avgROI !== undefined && (
              <div>
                Avg ROI: <span className={`font-medium ${hoveredEdge.stats.avgROI > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {hoveredEdge.stats.avgROI.toFixed(1)}%
                </span>
              </div>
            )}
            {hoveredEdge.transfers.slice(0, 4).map((transfer, idx) => (
              <div key={idx} className="text-xs bg-gray-50 rounded p-2">
                <div className="font-medium text-gray-700">{transfer.playerName}</div>
                <div className="flex justify-between text-gray-500 mt-1">
                  <span>
                    {transfer.transferFee ? formatCurrency(transfer.transferFee) : 'Free'}
                  </span>
                  <span>{transfer.season}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkCanvas;