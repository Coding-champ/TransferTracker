import { 
  optimizeNetworkData, 
  getOptimalPerformanceConfig, 
  PERFORMANCE_PRESETS,
  FrameRateLimiter
} from '../networkOptimizer';
import { NetworkData, NetworkNode, NetworkEdge } from '../../types';

// Mock large dataset for testing
const createMockLargeNetwork = (nodeCount: number, edgeCount: number): NetworkData => {
  const nodes: NetworkNode[] = [];
  const edges: NetworkEdge[] = [];

  // Create nodes
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      id: `node-${i}`,
      name: `Club ${i}`,
      shortName: `C${i}`,
      league: `League ${i % 5}`,
      country: `Country ${i % 10}`,
      stats: {
        transfersIn: Math.floor(Math.random() * 50),
        transfersOut: Math.floor(Math.random() * 50),
        totalSpent: Math.floor(Math.random() * 1000000),
        totalReceived: Math.floor(Math.random() * 1000000),
        netSpend: Math.floor(Math.random() * 2000000) - 1000000,
        avgROI: Math.floor(Math.random() * 200) - 100,
        successfulTransfersRate: Math.floor(Math.random() * 100)
      }
    });
  }

  // Create edges
  for (let i = 0; i < edgeCount; i++) {
    const sourceIdx = Math.floor(Math.random() * nodeCount);
    const targetIdx = Math.floor(Math.random() * nodeCount);
    
    if (sourceIdx !== targetIdx) {
      edges.push({
        id: `edge-${i}`,
        source: `node-${sourceIdx}`,
        target: `node-${targetIdx}`,
        transfers: [{
          id: i,
          playerName: `Player ${i}`,
          transferFee: Math.floor(Math.random() * 50000000),
          transferType: 'sale',
          date: '2023-07-15',
          season: '2023/24',
          position: 'Midfielder',
          direction: 'out' as const
        }],
        stats: {
          totalValue: Math.floor(Math.random() * 100000000),
          transferCount: Math.floor(Math.random() * 10) + 1,
          avgTransferValue: Math.floor(Math.random() * 50000000),
          types: ['sale'],
          successRate: Math.floor(Math.random() * 100),
          seasons: ['2023/24'],
          transferWindows: ['summer']
        }
      });
    }
  }

  return {
    nodes,
    edges,
    metadata: {
      totalTransfers: edgeCount,
      totalValue: edges.reduce((sum, e) => sum + e.stats.totalValue, 0),
      dateRange: { start: '2023-01-01', end: '2023-12-31' },
      clubCount: nodeCount,
      edgeCount,
      avgROI: 110,
      successRate: 75,
      filters: {} as any
    }
  };
};

describe('Network Optimizer', () => {
  describe('getOptimalPerformanceConfig', () => {
    it('should return small config for small datasets', () => {
      const config = getOptimalPerformanceConfig(30, 50);
      expect(config).toEqual(PERFORMANCE_PRESETS.small);
    });

    it('should return medium config for medium datasets', () => {
      const config = getOptimalPerformanceConfig(150, 300);
      expect(config).toEqual(PERFORMANCE_PRESETS.medium);
    });

    it('should return large config for large datasets', () => {
      const config = getOptimalPerformanceConfig(400, 800);
      expect(config).toEqual(PERFORMANCE_PRESETS.large);
    });

    it('should return xlarge config for very large datasets', () => {
      const config = getOptimalPerformanceConfig(1000, 2000);
      expect(config).toEqual(PERFORMANCE_PRESETS.xlarge);
    });
  });

  describe('optimizeNetworkData', () => {
    it('should limit nodes and edges based on performance config', () => {
      const largeNetwork = createMockLargeNetwork(500, 1000);
      const config = PERFORMANCE_PRESETS.large;
      
      const optimized = optimizeNetworkData(largeNetwork, config);
      
      expect(optimized.nodes.length).toBeLessThanOrEqual(config.maxNodes);
      expect(optimized.edges.length).toBeLessThanOrEqual(config.maxEdges);
      expect(optimized.metadata.isOptimized).toBe(true);
      expect(optimized.metadata.originalSize).toEqual({
        nodes: 500,
        edges: largeNetwork.edges.length // Use actual edge count instead of expected
      });
    });

    it('should keep most active nodes', () => {
      const largeNetwork = createMockLargeNetwork(100, 200);
      const config = { ...PERFORMANCE_PRESETS.medium, maxNodes: 10 };
      
      const optimized = optimizeNetworkData(largeNetwork, config);
      
      expect(optimized.nodes.length).toBe(10);
      
      // Check that nodes are sorted by activity (most active first)
      for (let i = 0; i < optimized.nodes.length - 1; i++) {
        const currentActivity = optimized.nodes[i].stats.transfersIn + optimized.nodes[i].stats.transfersOut;
        const nextActivity = optimized.nodes[i + 1].stats.transfersIn + optimized.nodes[i + 1].stats.transfersOut;
        expect(currentActivity).toBeGreaterThanOrEqual(nextActivity);
      }
    });

    it('should only keep edges between remaining nodes', () => {
      const largeNetwork = createMockLargeNetwork(50, 100);
      const config = { ...PERFORMANCE_PRESETS.medium, maxNodes: 20, maxEdges: 50 };
      
      const optimized = optimizeNetworkData(largeNetwork, config);
      const nodeIds = new Set(optimized.nodes.map(n => n.id));
      
      // All edges should connect nodes that are still in the optimized set
      optimized.edges.forEach(edge => {
        const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
        const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
        expect(nodeIds.has(sourceId)).toBe(true);
        expect(nodeIds.has(targetId)).toBe(true);
      });
    });
  });

  describe('FrameRateLimiter', () => {
    it('should create with default 60 FPS', () => {
      const limiter = new FrameRateLimiter();
      expect(limiter).toBeInstanceOf(FrameRateLimiter);
    });

    it('should create with custom FPS', () => {
      const limiter = new FrameRateLimiter(30);
      expect(limiter).toBeInstanceOf(FrameRateLimiter);
    });

    it('should call requestFrame method', () => {
      const limiter = new FrameRateLimiter(60);
      const callback = jest.fn();
      
      // Mock requestAnimationFrame
      const mockRAF = jest.fn((cb) => setTimeout(cb, 16));
      global.requestAnimationFrame = mockRAF;
      
      limiter.requestFrame(callback);
      
      expect(mockRAF).toHaveBeenCalled();
    });
  });
});