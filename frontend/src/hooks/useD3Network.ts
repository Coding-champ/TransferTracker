import { useRef, useCallback } from 'react';
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

interface UseD3NetworkProps {
  networkData: NetworkData;
  width: number;
  height: number;
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
  height
}: UseD3NetworkProps): UseD3NetworkReturn => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<NetworkNode, NetworkEdge> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const currentTransformRef = useRef(d3.zoomIdentity);
  const isInitializedRef = useRef(false);

  const { setSelectedNode, setHoveredEdge } = useAppContext();
  const {
    isDraggingRef,
    handleDragStart,
    handleDragEnd
  } = useNetworkInteractions();

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
    if (!networkData || !svgRef.current || isInitializedRef.current) return;

    console.log('Initializing D3 visualization...');
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
        }
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    // Enhanced simulation with adaptive forces
    const simulation = d3.forceSimulation<NetworkNode>(networkData.nodes)
      .force('link', d3.forceLink<NetworkNode, NetworkEdge>(networkData.edges)
        .id((d) => d.id)
        .distance((d) => {
          const baseDistance = 120;
          const transferCount = d.stats.transferCount;
          return Math.max(80, baseDistance - (transferCount * 5));
        })
        .strength(0.1))
      .force('charge', d3.forceManyBody()
        .strength((d) => {
          const activity = (d as NetworkNode).stats.transfersIn + (d as NetworkNode).stats.transfersOut;
          return -Math.max(200, Math.min(800, activity * 10));
        }))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide()
        .radius((d) => {
          const baseRadius = Math.sqrt((d as NetworkNode).stats.transfersIn + (d as NetworkNode).stats.transfersOut) * 2 + 8;
          return baseRadius + 5;
        }));

    simulationRef.current = simulation;

    // Create arrow markers
    createArrowMarkers(svg);

    // Create links
    const links = createLinks(zoomGroup, networkData.edges, handleEdgeHover, isDraggingRef);

    // Create nodes
    const { nodes, nodeCircles } = createNodes(zoomGroup, networkData.nodes, colorScale, handleNodeHover, handleNodeClick, simulation, isDraggingRef);

    // Create labels
    const { labels, roiLabels } = createLabels(zoomGroup, networkData.nodes);

    // Setup drag behavior
    const dragHandler = createDragBehavior(simulation, handleDragStart, handleDragEnd, isDraggingRef);
    nodeCircles.call(dragHandler);

    // Simulation tick function
    simulation.on('tick', () => {
      links
        .attr('x1', (d) => (d.source as NetworkNode).x!)
        .attr('y1', (d) => (d.source as NetworkNode).y!)
        .attr('x2', (d) => (d.target as NetworkNode).x!)
        .attr('y2', (d) => (d.target as NetworkNode).y!);

      nodes.attr('transform', (d) => `translate(${d.x},${d.y})`);
      labels.attr('x', (d) => d.x!).attr('y', (d) => d.y! + 35);
      roiLabels.attr('x', (d) => d.x!).attr('y', (d) => d.y! + 48);
    });

    // Add zoom controls
    createZoomControls(svg, zoom);

    // Cleanup function
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [networkData, colorScale, handleNodeHover, handleNodeClick, handleEdgeHover, handleDragStart, handleDragEnd, isDraggingRef, width, height]);

  return {
    svgRef,
    initializeVisualization
  };
};