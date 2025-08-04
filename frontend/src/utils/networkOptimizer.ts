import * as d3 from 'd3';
import { NetworkEdge, NetworkData } from '../types';
import { measureOptimization } from './performanceMonitor';

/**
 * Performance configuration for network visualization
 * Enhanced with additional LOD strategies
 */
export interface NetworkPerformanceConfig {
  // Maximum nodes/edges to render
  maxNodes: number;
  maxEdges: number;
  
  // Level-of-detail thresholds
  simplificationZoomThreshold: number; // Below this zoom level, simplify rendering
  hideLabelsZoomThreshold: number;     // Below this zoom level, hide labels
  hideSmallNodesZoomThreshold: number; // Below this zoom level, hide small nodes
  
  // Force simulation optimizations
  maxIterations: number;
  adaptiveAlpha: boolean;
  
  // Rendering optimizations
  useRequestAnimationFrame: boolean;
  targetFrameRate: number;
  enableViewportCulling: boolean;
  viewportBuffer: number; // Buffer around viewport for pre-rendering
  
  // LOD optimizations
  enableNodeClustering: boolean;     // Cluster distant nodes
  clusterDistance: number;           // Distance threshold for clustering
  minNodeSizeToShow: number;         // Minimum node size to render at low zoom
  enableEdgeFiltering: boolean;      // Filter low-value edges at low zoom
  minEdgeValueToShow: number;        // Minimum edge value to show at low zoom
}

/**
 * Default performance configuration optimized for different dataset sizes
 * Enhanced with LOD strategies - RE-ENABLED with conservative settings
 */
export const DEFAULT_PERFORMANCE_CONFIG: NetworkPerformanceConfig = {
  maxNodes: 500, // Conservative limit to ensure performance
  maxEdges: 1000, // Conservative limit to ensure performance
  simplificationZoomThreshold: 0.3, // Re-enabled with moderate threshold
  hideLabelsZoomThreshold: 0.2, // Re-enabled with conservative threshold
  hideSmallNodesZoomThreshold: 0.15, // Re-enabled with conservative threshold
  maxIterations: 300,
  adaptiveAlpha: true, // Re-enabled adaptive alpha for better performance
  useRequestAnimationFrame: true, // Re-enabled RAF for smooth rendering
  targetFrameRate: 60,
  enableViewportCulling: true, // Re-enabled viewport culling for performance
  viewportBuffer: 200,
  enableNodeClustering: false, // Keep disabled for now to avoid complexity
  clusterDistance: 100,
  minNodeSizeToShow: 3, // Re-enabled with conservative threshold
  enableEdgeFiltering: true, // Re-enabled edge filtering for performance
  minEdgeValueToShow: 100000 // Re-enabled with reasonable threshold (100K)
};

/**
 * Performance configurations for different dataset sizes
 * Re-tuned with conservative limits for stability
 */
export const PERFORMANCE_PRESETS = {
  small: {
    ...DEFAULT_PERFORMANCE_CONFIG,
    maxNodes: 100,
    maxEdges: 200,
    maxIterations: 500,
    enableViewportCulling: false // Disable for small datasets
  },
  medium: DEFAULT_PERFORMANCE_CONFIG,
  large: {
    ...DEFAULT_PERFORMANCE_CONFIG,
    maxNodes: 300,
    maxEdges: 600,
    simplificationZoomThreshold: 0.5,
    hideLabelsZoomThreshold: 0.3,
    maxIterations: 200,
    minNodeSizeToShow: 5
  },
  xlarge: {
    ...DEFAULT_PERFORMANCE_CONFIG,
    maxNodes: 200,
    maxEdges: 400,
    simplificationZoomThreshold: 0.6,
    hideLabelsZoomThreshold: 0.4,
    maxIterations: 150,
    minNodeSizeToShow: 8,
    minEdgeValueToShow: 500000 // Higher threshold for very large datasets
  }
};

/**
 * Determines appropriate performance configuration based on dataset size
 * Updated with circuit breaker for very large datasets
 */
export function getOptimalPerformanceConfig(nodeCount: number, edgeCount: number): NetworkPerformanceConfig {
  // Circuit breaker for extremely large datasets
  if (nodeCount > 2000 || edgeCount > 4000) {
    console.warn(`Dataset too large (${nodeCount} nodes, ${edgeCount} edges). Applying aggressive optimization.`);
    return {
      ...PERFORMANCE_PRESETS.xlarge,
      maxNodes: 150,
      maxEdges: 300,
      maxIterations: 100
    };
  }
  
  if (nodeCount <= 100 && edgeCount <= 200) {
    return PERFORMANCE_PRESETS.small;
  } else if (nodeCount <= 300 && edgeCount <= 600) {
    return PERFORMANCE_PRESETS.medium;
  } else if (nodeCount <= 800 && edgeCount <= 1500) {
    return PERFORMANCE_PRESETS.large;
  } else {
    return PERFORMANCE_PRESETS.xlarge;
  }
}

/**
 * Optimizes network data by filtering and aggregating nodes/edges based on performance config
 * RE-ENABLED with conservative settings for performance
 */
export function optimizeNetworkData(
  data: NetworkData, 
  config: NetworkPerformanceConfig
): NetworkData {
  const { nodes, edges } = data;
  
  // Add performance monitoring
  const endMeasure = measureOptimization(`data-${nodes.length}n-${edges.length}e`);
  console.log(`Optimizing network data: ${nodes.length} nodes, ${edges.length} edges`);
  
  // If dataset is within limits, return as-is for small datasets
  if (nodes.length <= config.maxNodes && edges.length <= config.maxEdges) {
    console.log(`Dataset within limits, returning unoptimized data`);
    return {
      nodes: nodes,
      edges: edges,
      metadata: {
        ...data.metadata,
        clubCount: nodes.length,
        edgeCount: edges.length,
        isOptimized: false,
        originalSize: {
          nodes: nodes.length,
          edges: edges.length
        }
      } as any
    };
  }
  
  // Apply optimization for large datasets
  // Sort nodes by importance (transfer activity)
  const sortedNodes = [...nodes].sort((a, b) => {
    const activityA = a.stats.transfersIn + a.stats.transfersOut;
    const activityB = b.stats.transfersIn + b.stats.transfersOut;
    return activityB - activityA;
  });
  
  // Take only the most important nodes
  const optimizedNodes = sortedNodes.slice(0, config.maxNodes);
  const nodeIds = new Set(optimizedNodes.map(n => n.id));
  
  // Filter edges to only include those between remaining nodes
  let optimizedEdges = edges.filter(edge => {
    const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
    const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
    return nodeIds.has(sourceId) && nodeIds.has(targetId);
  });
  
  // Sort edges by importance (transfer count and value)
  optimizedEdges = optimizedEdges
    .sort((a, b) => {
      const scoreA = a.stats.transferCount * Math.log(a.stats.totalValue + 1);
      const scoreB = b.stats.transferCount * Math.log(b.stats.totalValue + 1);
      return scoreB - scoreA;
    })
    .slice(0, config.maxEdges);
  
  // Aggregate similar edges if needed (keeping it simple for now)
  const aggregatedEdges = optimizedEdges; // Skip aggregation for stability
  
  const metric = endMeasure();
  console.log(`Optimization completed in ${metric.renderTime?.toFixed(2)}ms: ${optimizedNodes.length} nodes, ${aggregatedEdges.length} edges`);
  
  return {
    nodes: optimizedNodes,
    edges: aggregatedEdges,
    metadata: {
      ...data.metadata,
      clubCount: optimizedNodes.length,
      edgeCount: aggregatedEdges.length,
      isOptimized: true,
      originalSize: {
        nodes: nodes.length,
        edges: edges.length
      },
      optimizationTime: metric.renderTime
    } as any
  };
}

/**
 * Aggregates multiple edges between the same nodes into single edges
 * TEMPORARILY DISABLED - Not used with simplified optimization
 */
// function aggregateEdges(edges: NetworkEdge[]): NetworkEdge[] {
//   const edgeMap = new Map<string, NetworkEdge>();
//   
//   edges.forEach(edge => {
//     const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
//     const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
//     const key = `${sourceId}-${targetId}`;
//     
//     if (edgeMap.has(key)) {
//       const existing = edgeMap.get(key)!;
//       // Aggregate the edges
//       existing.transfers = [...existing.transfers, ...edge.transfers];
//       existing.stats = {
//         totalValue: existing.stats.totalValue + edge.stats.totalValue,
//         transferCount: existing.stats.transferCount + edge.stats.transferCount,
//         avgTransferValue: (existing.stats.totalValue + edge.stats.totalValue) / 
//                          (existing.stats.transferCount + edge.stats.transferCount),
//         types: Array.from(new Set([...existing.stats.types, ...edge.stats.types])),
//         avgROI: ((existing.stats.avgROI || 0) + (edge.stats.avgROI || 0)) / 2,
//         successRate: ((existing.stats.successRate || 0) + (edge.stats.successRate || 0)) / 2,
//         seasons: Array.from(new Set([...existing.stats.seasons, ...edge.stats.seasons])),
//         transferWindows: Array.from(new Set([...existing.stats.transferWindows, ...edge.stats.transferWindows]))
//       };
//     } else {
//       edgeMap.set(key, { ...edge });
//     }
//   });
//   
//   return Array.from(edgeMap.values());
// }

/**
 * Frame rate limiter using requestAnimationFrame
 */
export class FrameRateLimiter {
  private lastFrameTime = 0;
  private frameInterval: number;
  
  constructor(targetFPS: number = 60) {
    this.frameInterval = 1000 / targetFPS;
  }
  
  requestFrame(callback: () => void): void {
    requestAnimationFrame((currentTime) => {
      if (currentTime - this.lastFrameTime >= this.frameInterval) {
        this.lastFrameTime = currentTime;
        callback();
      }
    });
  }
}

/**
 * Viewport culling helper
 */
export function isElementInViewport(
  element: { x?: number; y?: number },
  viewport: { x: number; y: number; width: number; height: number },
  buffer: number = 0
): boolean {
  if (!element.x || !element.y) return true; // Show if position unknown
  
  return (
    element.x >= viewport.x - buffer &&
    element.x <= viewport.x + viewport.width + buffer &&
    element.y >= viewport.y - buffer &&
    element.y <= viewport.y + viewport.height + buffer
  );
}

/**
 * Gets viewport bounds from zoom transform
 */
export function getViewportBounds(
  transform: d3.ZoomTransform,
  width: number,
  height: number
): { x: number; y: number; width: number; height: number } {
  return {
    x: -transform.x / transform.k,
    y: -transform.y / transform.k,
    width: width / transform.k,
    height: height / transform.k
  };
}

/**
 * Enhanced LOD filtering for nodes based on zoom level and viewport
 * RE-ENABLED with conservative settings
 */
export function filterNodesForLOD(
  nodes: any[],
  zoomLevel: number,
  viewport: { x: number; y: number; width: number; height: number },
  config: NetworkPerformanceConfig
): any[] {
  // Always show all nodes at high zoom levels
  if (zoomLevel >= config.simplificationZoomThreshold) {
    return nodes;
  }

  return nodes.filter(node => {
    // Hide small nodes at low zoom levels
    if (zoomLevel < config.hideSmallNodesZoomThreshold) {
      const nodeSize = node.stats?.transfersIn + node.stats?.transfersOut || 0;
      if (nodeSize < config.minNodeSizeToShow) {
        return false;
      }
    }

    // Viewport culling if enabled
    if (config.enableViewportCulling) {
      return isElementInViewport(node, viewport, config.viewportBuffer);
    }

    return true;
  });
}

/**
 * Enhanced LOD filtering for edges based on zoom level and value
 * RE-ENABLED with conservative settings
 */
export function filterEdgesForLOD(
  edges: NetworkEdge[],
  zoomLevel: number,
  config: NetworkPerformanceConfig
): NetworkEdge[] {
  // Show all edges at high zoom levels
  if (zoomLevel >= config.simplificationZoomThreshold) {
    return edges;
  }

  // Filter low-value edges at low zoom levels
  if (config.enableEdgeFiltering) {
    return edges.filter(edge => {
      return edge.stats.totalValue >= config.minEdgeValueToShow;
    });
  }

  return edges;
}

/**
 * Adaptive alpha for force simulation based on dataset size
 */
export function getAdaptiveAlpha(nodeCount: number, edgeCount: number): number {
  const totalElements = nodeCount + edgeCount;
  
  if (totalElements > 1000) {
    return 0.1; // Lower alpha for large networks
  } else if (totalElements > 500) {
    return 0.2;
  } else if (totalElements > 100) {
    return 0.3;
  } else {
    return 0.5; // Higher alpha for small networks
  }
}