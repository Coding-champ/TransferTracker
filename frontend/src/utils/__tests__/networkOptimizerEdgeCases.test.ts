import { 
  optimizeNetworkData, 
  getOptimalPerformanceConfig,
  filterNodesForLOD,
  filterEdgesForLOD,
  getAdaptiveAlpha,
  DEFAULT_PERFORMANCE_CONFIG 
} from '../networkOptimizer';
import { NetworkData, NetworkNode, NetworkEdge } from '../../types';

describe('NetworkOptimizer - Enhanced Edge Cases', () => {
  const mockNetworkData: NetworkData = {
    nodes: [
      {
        id: 'club1',
        name: 'Club 1',
        league: 'League 1',
        stats: { transfersIn: 10, transfersOut: 5 }
      },
      {
        id: 'club2',
        name: 'Club 2',
        league: 'League 2',
        stats: { transfersIn: 2, transfersOut: 1 }
      },
      {
        id: 'club3',
        name: 'Club 3',
        league: 'League 1',
        stats: { transfersIn: 8, transfersOut: 7 }
      }
    ] as NetworkNode[],
    edges: [
      {
        id: 'edge1',
        source: 'club1',
        target: 'club2',
        transfers: [],
        stats: {
          totalValue: 5000000,
          transferCount: 2,
          avgTransferValue: 2500000,
          types: ['sale'],
          avgROI: 10,
          successRate: 80,
          seasons: ['2023/24'],
          transferWindows: ['summer']
        }
      },
      {
        id: 'edge2',
        source: 'club2',
        target: 'club3',
        transfers: [],
        stats: {
          totalValue: 500000,
          transferCount: 1,
          avgTransferValue: 500000,
          types: ['loan'],
          avgROI: -5,
          successRate: 60,
          seasons: ['2023/24'],
          transferWindows: ['winter']
        }
      }
    ] as NetworkEdge[],
    metadata: {
      totalTransfers: 3,
      avgTransferValue: 1833333,
      avgROI: 2.5,
      successRate: 70,
      clubCount: 3,
      timeRange: '2023/24'
    }
  };

  describe('optimizeNetworkData', () => {
    test('handles empty network data', () => {
      const emptyData: NetworkData = {
        nodes: [],
        edges: [],
        metadata: {
          totalTransfers: 0,
          avgTransferValue: 0,
          avgROI: 0,
          successRate: 0,
          clubCount: 0,
          timeRange: '2023/24'
        }
      };

      const result = optimizeNetworkData(emptyData, DEFAULT_PERFORMANCE_CONFIG);
      
      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
      expect(result.metadata.isOptimized).toBe(false); // Small datasets aren't optimized now
    });

    test('limits nodes correctly based on config', () => {
      const config = { ...DEFAULT_PERFORMANCE_CONFIG, maxNodes: 2 };
      
      const result = optimizeNetworkData(mockNetworkData, config);
      
      expect(result.nodes).toHaveLength(2);
      // Should keep the most active clubs (club1 and club3)
      expect(result.nodes.map(n => n.id)).toContain('club1');
      expect(result.nodes.map(n => n.id)).toContain('club3');
    });

    test('filters edges for remaining nodes only', () => {
      const config = { ...DEFAULT_PERFORMANCE_CONFIG, maxNodes: 2, maxEdges: 10 };
      
      const result = optimizeNetworkData(mockNetworkData, config);
      
      // Should only have edges between remaining nodes
      result.edges.forEach(edge => {
        const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
        const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
        
        const nodeIds = result.nodes.map(n => n.id);
        expect(nodeIds).toContain(sourceId);
        expect(nodeIds).toContain(targetId);
      });
    });

    test('preserves original metadata while adding optimization info', () => {
      const result = optimizeNetworkData(mockNetworkData, DEFAULT_PERFORMANCE_CONFIG);
      
      expect(result.metadata.totalTransfers).toBe(mockNetworkData.metadata.totalTransfers);
      expect(result.metadata.isOptimized).toBe(false); // Small dataset, no optimization needed
      expect(result.metadata.originalSize).toEqual({
        nodes: 3,
        edges: 2
      });
    });
  });

  describe('getOptimalPerformanceConfig', () => {
    test('returns small config for small datasets', () => {
      const config = getOptimalPerformanceConfig(30, 50);
      expect(config.maxNodes).toBe(100); // Updated based on our new PERFORMANCE_PRESETS.small
      expect(config.maxEdges).toBe(200);
    });

    test('returns xlarge config for very large datasets', () => {
      const config = getOptimalPerformanceConfig(1000, 2000);
      expect(config.maxNodes).toBe(200); // Updated based on our new PERFORMANCE_PRESETS.xlarge
      expect(config.maxEdges).toBe(400);
      expect(config.simplificationZoomThreshold).toBe(0.9); // Updated to match our new xlarge config
    });

    test('returns medium config for medium datasets', () => {
      const config = getOptimalPerformanceConfig(150, 300);
      expect(config.maxNodes).toBe(500); // Updated based on our new DEFAULT_PERFORMANCE_CONFIG
      expect(config.maxEdges).toBe(1000);
    });
  });

  describe('filterNodesForLOD', () => {
    const mockNodes = [
      { id: 'node1', x: 100, y: 100, stats: { transfersIn: 10, transfersOut: 5 } },
      { id: 'node2', x: 200, y: 200, stats: { transfersIn: 2, transfersOut: 1 } },
      { id: 'node3', x: 1000, y: 1000, stats: { transfersIn: 1, transfersOut: 0 } }
    ];

    const viewport = { x: 0, y: 0, width: 500, height: 500 };

    test('shows all nodes at high zoom levels', () => {
      const result = filterNodesForLOD(mockNodes, 1.0, viewport, DEFAULT_PERFORMANCE_CONFIG);
      expect(result).toHaveLength(3);
    });

    test('filters small nodes at low zoom levels when threshold conditions are met', () => {
      const config = { 
        ...DEFAULT_PERFORMANCE_CONFIG, 
        hideSmallNodesZoomThreshold: 0.8, 
        minNodeSizeToShow: 2,
        enableViewportCulling: false 
      };
      const result = filterNodesForLOD(mockNodes, 0.1, viewport, config); // Use 0.1 zoom level to ensure filtering
      
      // Should filter out node3 which has only 1 total transfer (less than minNodeSizeToShow of 2)
      expect(result).toHaveLength(2);
      expect(result.map(n => n.id)).not.toContain('node3');
    });

    test('applies viewport culling when enabled', () => {
      const config = { 
        ...DEFAULT_PERFORMANCE_CONFIG, 
        enableViewportCulling: true, 
        viewportBuffer: 0,
        hideSmallNodesZoomThreshold: 0.1, // Disable size filtering for this test
        simplificationZoomThreshold: 0.5 // Set higher so zoom 0.2 will trigger filtering
      };
      const result = filterNodesForLOD(mockNodes, 0.2, viewport, config); // Use zoom level < simplificationZoomThreshold but above hideSmallNodesZoomThreshold
      
      // node3 is outside viewport (x: 1000, y: 1000 is outside 0,0,500,500)
      expect(result.map(n => n.id)).not.toContain('node3');
    });

    test('handles nodes without position data', () => {
      const nodesWithoutPosition = [
        { id: 'node1', stats: { transfersIn: 10, transfersOut: 5 } },
        { id: 'node2', stats: { transfersIn: 2, transfersOut: 1 } }
      ];

      const result = filterNodesForLOD(nodesWithoutPosition, 0.5, viewport, DEFAULT_PERFORMANCE_CONFIG);
      expect(result).toHaveLength(2); // Should show all when position unknown
    });
  });

  describe('filterEdgesForLOD', () => {
    test('shows all edges at high zoom levels', () => {
      const result = filterEdgesForLOD(mockNetworkData.edges, 1.0, DEFAULT_PERFORMANCE_CONFIG);
      expect(result).toHaveLength(2);
    });

    test('filters low-value edges at low zoom levels', () => {
      const config = { 
        ...DEFAULT_PERFORMANCE_CONFIG, 
        enableEdgeFiltering: true, 
        minEdgeValueToShow: 1000000,
        simplificationZoomThreshold: 0.5 // Set higher so zoom 0.2 will trigger filtering
      };
      const result = filterEdgesForLOD(mockNetworkData.edges, 0.2, config); // Use zoom level < simplificationZoomThreshold
      
      // Should filter out edge2 which has only 500000 value
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('edge1');
    });

    test('disables filtering when enableEdgeFiltering is false', () => {
      const config = { ...DEFAULT_PERFORMANCE_CONFIG, enableEdgeFiltering: false };
      const result = filterEdgesForLOD(mockNetworkData.edges, 0.3, config);
      
      expect(result).toHaveLength(2);
    });
  });

  describe('getAdaptiveAlpha', () => {
    test('returns lower alpha for large networks', () => {
      const alpha = getAdaptiveAlpha(800, 400);
      expect(alpha).toBe(0.1);
    });

    test('returns higher alpha for small networks', () => {
      const alpha = getAdaptiveAlpha(50, 30);
      expect(alpha).toBe(0.5);
    });

    test('returns medium alpha for medium networks', () => {
      const alpha = getAdaptiveAlpha(300, 300);
      expect(alpha).toBe(0.2);
    });

    test('handles edge case of zero elements', () => {
      const alpha = getAdaptiveAlpha(0, 0);
      expect(alpha).toBe(0.5);
    });
  });
});