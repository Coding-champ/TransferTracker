import { useRef, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { NetworkNode, NetworkEdge, NetworkData } from '../types';
import { useNetworkInteractions } from './useNetworkInteractions';
import { useAppContext } from '../contexts/AppContext';
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
  // isElementInViewport, // TEMPORARILY DISABLED
  // getViewportBounds,   // TEMPORARILY DISABLED
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

  const { setSelectedNode, setHoveredEdge } = useAppContext();
  const {
    isDraggingRef,
    handleDragStart,
    handleDragEnd
  } = useNetworkInteractions();

  // Optimize network data based on performance configuration
  const optimizedData = useMemo(() => {
    if (!networkData) return networkData;
    
    const config = performanceConfig || getOptimalPerformanceConfig(
      networkData.nodes.length,
      networkData.edges.length
    );
    
    console.log(`Optimizing network: ${networkData.nodes.length} nodes, ${networkData.edges.length} edges -> max ${config.maxNodes} nodes, ${config.maxEdges} edges`);
    
    return optimizeNetworkData(networkData, config);
  }, [networkData, performanceConfig]);

  // Get current performance config
  const currentConfig = useMemo(() => 
    performanceConfig || getOptimalPerformanceConfig(
      networkData?.nodes.length || 0,
      networkData?.edges.length || 0
    ), [networkData, performanceConfig]);

  // Initialize frame rate limiter
  if (!frameRateLimiterRef.current && currentConfig.useRequestAnimationFrame) {
    frameRateLimiterRef.current = new FrameRateLimiter(currentConfig.targetFrameRate);
  }

  // Enhanced color scale for leagues
  const colorScale = d3.scaleOrdinal<string>()
    .domain(['Bundesliga', 'Premier League', 'La Liga', 'Serie A', 'Ligue 1', 'Eredivisie', 'Primeira Liga', 'Süper Lig'])
    .range(['#d70909', '#3d0845', '#ff6b35', '#004225', '#1e3a8a', '#ff8c00', '#228b22', '#dc143c']);

  // Node hover handler
  const handleNodeHover = useCallback((node: NetworkNode | null) => {
    if (!isDraggingRef.current && node) {
      setSelectedNode({ ...node, stats: { ...node.stats } });
    }
  }, [isDraggingRef, setSelectedNode]);

  // Node click handler  
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
        
        simulation.alpha(0.1).restart();
      }
    }, 50);
  }, [isDraggingRef]);

  // Edge hover handler
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
  }, [isDraggingRef, setHoveredEdge]);

  // D3 visualization initialization
  const initializeVisualization = useCallback(() => {
    if (!optimizedData || !svgRef.current || isInitializedRef.current) return;

    console.log('Initializing D3 visualization with optimizations...');
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
          
          // TEMPORARILY DISABLED: Update visibility based on zoom level if LOD is enabled
          // if (currentConfig.enableViewportCulling) {
          //   updateElementVisibility(event.transform);
          // }
        }
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    // Enhanced simulation with adaptive forces optimized for performance
    const nodeCount = optimizedData.nodes.length;
    
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

    // Optimize simulation parameters for large datasets
    if (currentConfig.adaptiveAlpha) {
      const alphaDecay = nodeCount > 100 ? 0.05 : 0.0228;
      simulation.alphaDecay(alphaDecay);
    }

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
    const dragHandler = createDragBehavior(simulation, handleDragStart, handleDragEnd, isDraggingRef);
    nodeCircles.call(dragHandler);

    // Optimized simulation tick function with requestAnimationFrame
    let tickCount = 0;
    const maxTicks = currentConfig.maxIterations;

    const tick = () => {
      // Performance optimization: limit tick updates for large datasets
      if (tickCount++ > maxTicks) {
        simulation.stop();
        return;
      }

      const renderUpdate = () => {
        const currentTime = performance.now();
        
        // Throttle rendering for better performance
        if (currentTime - lastRenderTimeRef.current < 16) return; // ~60fps
        lastRenderTimeRef.current = currentTime;

        // TEMPORARILY DISABLED: Get current viewport for culling 
        // const viewport = currentConfig.enableViewportCulling
        //   ? getViewportBounds(currentTransformRef.current, width, height)
        //   : null;

        links
          .attr('x1', (d) => (d.source as NetworkNode).x!)
          .attr('y1', (d) => (d.source as NetworkNode).y!)
          .attr('x2', (d) => (d.target as NetworkNode).x!)
          .attr('y2', (d) => (d.target as NetworkNode).y!);

        // TEMPORARILY DISABLED: Viewport culling for links
        // if (viewport && currentConfig.enableViewportCulling) {
        //   links.style('display', (d) => {
        //     const source = d.source as NetworkNode;
        //     const target = d.target as NetworkNode;
        //     const visible = isElementInViewport(source, viewport, currentConfig.viewportBuffer) ||
        //                    isElementInViewport(target, viewport, currentConfig.viewportBuffer);
        //     return visible ? 'block' : 'none';
        //   });
        // }

        nodes.attr('transform', (d) => `translate(${d.x},${d.y})`);

        // TEMPORARILY DISABLED: Viewport culling for nodes
        // if (viewport && currentConfig.enableViewportCulling) {
        //   nodes.style('display', (d) => {
        //     const visible = isElementInViewport(d, viewport, currentConfig.viewportBuffer);
        //     return visible ? 'block' : 'none';
        //   });
        // }

        // Level-of-detail for labels
        const currentZoom = currentTransformRef.current.k;
        const showLabels = currentZoom >= currentConfig.hideLabelsZoomThreshold;
        const showROI = currentZoom >= currentConfig.simplificationZoomThreshold;

        labels
          .attr('x', (d) => d.x!)
          .attr('y', (d) => d.y! + 35)
          .style('display', showLabels ? 'block' : 'none');

        roiLabels
          .attr('x', (d) => d.x!)
          .attr('y', (d) => d.y! + 48)
          .style('display', showROI ? 'block' : 'none');
      };

      // TEMPORARILY DISABLED: Use requestAnimationFrame for smoother rendering
      // if (currentConfig.useRequestAnimationFrame && frameRateLimiterRef.current) {
      //   frameRateLimiterRef.current.requestFrame(renderUpdate);
      // } else {
        renderUpdate();
      // }
    };

    simulation.on('tick', tick);

    // TEMPORARILY DISABLED: Function to update element visibility based on zoom and viewport
    // const updateElementVisibility = (transform: d3.ZoomTransform) => {
    //   const currentZoom = transform.k;
    //   const viewport = getViewportBounds(transform, width, height);
    //
    //   // Level-of-detail adjustments
    //   const showLabels = currentZoom >= currentConfig.hideLabelsZoomThreshold;
    //   const showROI = currentZoom >= currentConfig.simplificationZoomThreshold;
    //   const showPerformanceRings = currentZoom >= currentConfig.simplificationZoomThreshold;
    //
    //   labels.style('display', showLabels ? 'block' : 'none');
    //   roiLabels.style('display', showROI ? 'block' : 'none');
    //   svg.selectAll('.performance-ring').style('display', showPerformanceRings ? 'block' : 'none');
    //
    //   // Viewport culling
    //   if (currentConfig.enableViewportCulling) {
    //     nodes.style('display', (d) => {
    //       const visible = isElementInViewport(d, viewport, currentConfig.viewportBuffer);
    //       return visible ? 'block' : 'none';
    //     });
    //
    //     links.style('display', (d) => {
    //       const source = d.source as NetworkNode;
    //       const target = d.target as NetworkNode;
    //       const visible = isElementInViewport(source, viewport, currentConfig.viewportBuffer) ||
    //                      isElementInViewport(target, viewport, currentConfig.viewportBuffer);
    //       return visible ? 'block' : 'none';
    //     });
    //   }
    // };

    // Add zoom controls
    createZoomControls(svg, zoom);

    // Cleanup function
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
      isInitializedRef.current = false;
    };
  }, [optimizedData, colorScale, handleNodeHover, handleNodeClick, handleEdgeHover, handleDragStart, handleDragEnd, isDraggingRef, width, height, currentConfig]);

  return {
    svgRef,
    initializeVisualization
  };
};