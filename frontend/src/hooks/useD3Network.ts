import { useRef, useCallback, useMemo, useEffect } from 'react';
import * as d3 from 'd3';
import { NetworkNode, NetworkEdge, NetworkData } from '../types';
import { useNetworkInteractions } from './useNetworkInteractions';
import { useAppContext } from '../contexts/AppContext';
import { measureNetworkRender } from '../utils/performanceMonitor';
import {
  createArrowMarkers,
  createLinks,
  createNodes,
  createLabels,
  createDragBehavior,
  createZoomControls
} from '../utils/d3Helpers';
import {
  optimizeNetworkData,
  getOptimalPerformanceConfig,
  FrameRateLimiter,
  NetworkPerformanceConfig
} from '../utils/networkOptimizer';

interface UseD3NetworkProps {
  networkData: NetworkData;
  width: number;
  height: number;
  performanceConfig?: NetworkPerformanceConfig;
}

interface UseD3NetworkReturn {
  svgRef: React.RefObject<SVGSVGElement>;
  initializeVisualization: () => (() => void) | undefined;
  restartSimulation: () => void;
  isSimulationRunning: () => boolean;
  zoomRef: React.RefObject<d3.ZoomBehavior<SVGSVGElement, unknown>>;
}

/**
 * Custom hook for managing D3 network visualization
 * Handles D3 simulation, event handlers, zoom behavior, and cleanup
 */
export const useD3Network = ({
  networkData,
  width,
  height,
  performanceConfig
}: UseD3NetworkProps): UseD3NetworkReturn => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<NetworkNode, NetworkEdge> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const currentTransformRef = useRef(d3.zoomIdentity);
  const isInitializedRef = useRef(false);
  const frameRateLimiterRef = useRef<FrameRateLimiter | null>(null);
  const lastRenderTimeRef = useRef(0);
  
  // Add circuit breaker to prevent infinite re-renders
  const initializationCountRef = useRef(0);
  const lastNetworkDataRef = useRef<NetworkData | null>(null);

  const { setSelectedNode, setHoveredEdge } = useAppContext();
  const {
    isDraggingRef,
    handleDragStart,
    handleDragEnd
  } = useNetworkInteractions();

  // Check if network data has actually changed (deep comparison for critical properties)
  const hasNetworkDataChanged = useMemo(() => {
    if (!lastNetworkDataRef.current && networkData) {
      lastNetworkDataRef.current = networkData;
      return true;
    }
    if (!lastNetworkDataRef.current || !networkData) {
      return true;
    }
    
    const current = lastNetworkDataRef.current;
    const hasChanged = 
      current.nodes.length !== networkData.nodes.length ||
      current.edges.length !== networkData.edges.length ||
      JSON.stringify(current.metadata) !== JSON.stringify(networkData.metadata);
      
    if (hasChanged) {
      lastNetworkDataRef.current = networkData;
    }
    
    return hasChanged;
  }, [networkData]);

  // Stabilize performance config with useMemo  
  const stablePerformanceConfig = useMemo(() => {
    if (performanceConfig) return performanceConfig;
    if (!networkData) return null;
    
    return getOptimalPerformanceConfig(
      networkData.nodes.length,
      networkData.edges.length
    );
  }, [performanceConfig, networkData]);

  // Optimize network data only when data actually changes
  const optimizedData = useMemo(() => {
    if (!networkData) return null;
    if (!hasNetworkDataChanged && lastNetworkDataRef.current) {
      return lastNetworkDataRef.current;
    }
    
    const config = stablePerformanceConfig || getOptimalPerformanceConfig(
      networkData.nodes.length,
      networkData.edges.length
    );
    
    console.log(`Optimizing network: ${networkData.nodes.length} nodes, ${networkData.edges.length} edges -> max ${config.maxNodes} nodes, ${config.maxEdges} edges`);
    
    return optimizeNetworkData(networkData, config);
  }, [networkData, hasNetworkDataChanged, stablePerformanceConfig]);

  // Simulation control functions
  const restartSimulation = useCallback(() => {
    if (simulationRef.current) {
      console.log('Restarting simulation due to user interaction');
      simulationRef.current.alpha(0.3).restart();
    }
  }, []);

  const isSimulationRunning = useCallback(() => {
    return simulationRef.current ? simulationRef.current.alpha() > 0.001 : false;
  }, []);

  // Enhanced color scale for leagues - memoized to prevent recreation
  const colorScale = useMemo(() => d3.scaleOrdinal<string>()
    .domain(['Bundesliga', 'Premier League', 'La Liga', 'Serie A', 'Ligue 1', 'Eredivisie', 'Primeira Liga', 'Süper Lig'])
    .range(['#d70909', '#3d0845', '#ff6b35', '#004225', '#1e3a8a', '#ff8c00', '#228b22', '#dc143c']), []);

  // Node hover handler - stable callback to prevent re-renders
  const handleNodeHover = useCallback((node: NetworkNode | null) => {
    if (!isDraggingRef.current && node) {
      setSelectedNode({ ...node, stats: { ...node.stats } });
    }
  }, [setSelectedNode, isDraggingRef]);

  // Node click handler - stable callback to prevent re-renders  
  const handleNodeClick = useCallback((node: NetworkNode, simulation: any) => {
    if (isDraggingRef.current) {
      console.log('Click suppressed - currently dragging');
      return;
    }
    
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
        
        // Use restartSimulation instead of manual alpha setting
        restartSimulation();
      }
    }, 50);
  }, [isDraggingRef, restartSimulation]);

  // Edge hover handler - stable callback to prevent re-renders
  const handleEdgeHover = useCallback((edge: NetworkEdge | null) => {
    if (!isDraggingRef.current && edge) {
      setHoveredEdge({ 
        ...edge, 
        stats: { ...edge.stats },
        transfers: [...edge.transfers]
      });
    } else if (!edge) {
      setHoveredEdge(null);
    }
  }, [setHoveredEdge, isDraggingRef]);

  // Initialize frame rate limiter - RE-ENABLED with stable config
  useEffect(() => {
    if (!frameRateLimiterRef.current && stablePerformanceConfig?.useRequestAnimationFrame) {
      frameRateLimiterRef.current = new FrameRateLimiter(stablePerformanceConfig.targetFrameRate);
    }
  }, [stablePerformanceConfig?.useRequestAnimationFrame, stablePerformanceConfig?.targetFrameRate]);

  // D3 visualization initialization - STABILIZED to prevent infinite re-renders
  const initializeVisualization = useCallback(() => {
    // Circuit breaker: prevent excessive initializations
    if (initializationCountRef.current > 5) {
      console.warn('Circuit breaker: Too many initialization attempts, skipping');
      return;
    }
    
    if (!optimizedData || !svgRef.current) {
      return;
    }

    // If already initialized and data hasn't changed, skip re-initialization
    if (isInitializedRef.current && !hasNetworkDataChanged) {
      console.log('Skipping re-initialization: already initialized and data unchanged');
      return;
    }

    console.log('Initializing D3 visualization with optimizations...');
    initializationCountRef.current++;
    
    // Start performance monitoring
    const endMeasure = measureNetworkRender(optimizedData.nodes.length, optimizedData.edges.length);
    
    // Cleanup previous simulation if exists
    if (simulationRef.current) {
      simulationRef.current.stop();
      simulationRef.current = null;
    }
    
    isInitializedRef.current = true;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg.attr('width', width).attr('height', height);

    // Create zoom container
    const zoomGroup = svg.append('g').attr('class', 'zoom-group');

    // Enhanced zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .filter((event) => {
        if (isDraggingRef.current) return false;
        
        const target = event.target as Element;
        const isNode = target.classList.contains('node') || target.closest('.node');
        
        if (event.type === 'wheel') return true;
        if (event.type === 'mousedown' && !isNode) return true;
        
        return false;
      })
      .on('zoom', (event) => {
        if (!isDraggingRef.current) {
          currentTransformRef.current = event.transform;
          zoomGroup.attr('transform', event.transform);
          
          // Restart simulation on zoom interaction
          restartSimulation();
          
          // DISABLED: Aggressive viewport culling to prevent render thrashing
          // if (stablePerformanceConfig?.enableViewportCulling) {
          //   updateElementVisibility(event.transform);
          // }
        }
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    // Enhanced simulation with adaptive forces optimized for performance
    const nodeCount = optimizedData.nodes.length;
    const config = stablePerformanceConfig || getOptimalPerformanceConfig(nodeCount, optimizedData.edges.length);
    
    // Adaptive force strengths based on dataset size
    const chargeStrength = Math.max(-800, -200 - (nodeCount * 2));
    const linkDistance = Math.max(50, 120 - (nodeCount * 0.5));
    const collisionRadius = Math.max(15, 25 - (nodeCount * 0.1));

    const simulation = d3.forceSimulation<NetworkNode>(optimizedData.nodes)
      .force('link', d3.forceLink<NetworkNode, NetworkEdge>(optimizedData.edges)
        .id((d) => d.id)
        .distance(linkDistance)
        .strength(0.1))
      .force('charge', d3.forceManyBody()
        .strength(chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide()
        .radius(collisionRadius));

    // Optimize simulation parameters for large datasets with proper alpha management
    if (config.adaptiveAlpha) {
      const alphaDecay = nodeCount > 100 ? 0.05 : 0.0228;
      simulation.alphaDecay(alphaDecay);
    }
    
    // Set alpha target to 0 for automatic stopping and threshold for stabilization
    simulation.alphaTarget(0).alphaMin(0.001);

    simulationRef.current = simulation;

    // Create arrow markers
    createArrowMarkers(svg);

    // Create links
    const links = createLinks(zoomGroup, optimizedData.edges, handleEdgeHover, isDraggingRef);

    // Create nodes
    const { nodes, nodeCircles } = createNodes(zoomGroup, optimizedData.nodes, colorScale, handleNodeHover, handleNodeClick, simulation, isDraggingRef);

    // Create labels (initially hidden if zoom level is too low)
    const { labels, roiLabels } = createLabels(zoomGroup, optimizedData.nodes);

    // Setup drag behavior
    const dragHandler = createDragBehavior(simulation, handleDragStart, handleDragEnd, isDraggingRef, restartSimulation);
    nodeCircles.call(dragHandler);

    // Optimized simulation tick function with proper alpha threshold management
    let tickCount = 0;
    const maxTicks = config.maxIterations;
    let isStabilized = false;
    const ALPHA_THRESHOLD = 0.005; // Threshold for considering simulation stabilized

    const tick = () => {
      const currentAlpha = simulation.alpha();
      
      // Stop simulation if alpha drops below threshold or max ticks reached
      if (currentAlpha < ALPHA_THRESHOLD || tickCount++ > maxTicks || isStabilized) {
        simulation.stop();
        console.log(`Simulation stopped after ${tickCount} ticks (alpha: ${currentAlpha.toFixed(4)}, stabilized: ${isStabilized})`);
        return;
      }

      // Check for stabilization (alpha below threshold)
      if (currentAlpha < ALPHA_THRESHOLD) {
        isStabilized = true;
        simulation.stop();
        console.log(`Simulation stabilized with alpha: ${currentAlpha.toFixed(4)}`);
        return;
      }

      const renderUpdate = () => {
        const currentTime = performance.now();
        
        // Enhanced throttling for better performance (reduced to 30fps for smoother experience)
        if (currentTime - lastRenderTimeRef.current < 33) return; // ~30fps
        lastRenderTimeRef.current = currentTime;

        // Basic link positioning without aggressive viewport culling
        links
          .attr('x1', (d) => (d.source as NetworkNode).x!)
          .attr('y1', (d) => (d.source as NetworkNode).y!)
          .attr('x2', (d) => (d.target as NetworkNode).x!)
          .attr('y2', (d) => (d.target as NetworkNode).y!);

        // Basic node positioning without aggressive viewport culling
        nodes.attr('transform', (d) => `translate(${d.x},${d.y})`);

        // Conservative level-of-detail for labels only
        const currentZoom = currentTransformRef.current.k;
        const showLabels = currentZoom >= 0.5; // More conservative threshold
        const showROI = currentZoom >= 0.7; // More conservative threshold

        labels
          .attr('x', (d) => d.x!)
          .attr('y', (d) => d.y! + 35)
          .style('display', showLabels ? 'block' : 'none');

        roiLabels
          .attr('x', (d) => d.x!)
          .attr('y', (d) => d.y! + 48)
          .style('display', showROI ? 'block' : 'none');
      };

      // Use requestAnimationFrame for smoother rendering with frame limiting
      if (config.useRequestAnimationFrame && frameRateLimiterRef.current) {
        frameRateLimiterRef.current.requestFrame(renderUpdate);
      } else {
        renderUpdate();
      }
    };

    simulation.on('tick', tick);

    // Add zoom controls
    createZoomControls(svg, zoom);
    
    // End performance monitoring
    const metric = endMeasure();
    console.log(`Network visualization initialized in ${metric.renderTime?.toFixed(2)}ms`);

    // Reset circuit breaker on successful initialization
    initializationCountRef.current = 0;

    // Cleanup function with proper memory management
    return () => {
      console.log('Cleaning up D3 visualization...');
      
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
      
      // Clear frame rate limiter
      if (frameRateLimiterRef.current) {
        frameRateLimiterRef.current = null;
      }
      
      // Clear zoom behavior
      if (zoomRef.current && svgRef.current) {
        const svg = d3.select(svgRef.current);
        svg.on('.zoom', null);
        zoomRef.current = null;
      }
      
      // Clear all event listeners
      if (svgRef.current) {
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').on('.drag', null).on('.click', null).on('.mouseover', null).on('.mouseout', null);
      }
      
      isInitializedRef.current = false;
      console.log('D3 visualization cleaned up');
    };
  }, [optimizedData, width, height, stablePerformanceConfig, hasNetworkDataChanged, colorScale, handleNodeHover, handleNodeClick, handleEdgeHover, handleDragStart, handleDragEnd, isDraggingRef, restartSimulation]);

  return {
    svgRef,
    initializeVisualization,
    restartSimulation,
    isSimulationRunning,
    zoomRef
  };
};