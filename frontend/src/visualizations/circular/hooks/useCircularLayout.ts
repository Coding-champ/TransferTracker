import { useMemo } from 'react';
import { 
  CircularLayout, 
  CircularNode, 
  CircularArc, 
  CircularTier,
  UseCircularLayoutProps
} from '../types';
import { calculateCircularPositions, groupNodesByTier } from '../utils/circularCalculations';

export const useCircularLayout = ({
  networkData,
  config,
  rotation,
  zoomState
}: UseCircularLayoutProps): CircularLayout | null => {
  
  return useMemo(() => {
    if (!networkData?.nodes || !networkData?.edges) {
      return null;
    }

    const { width, height, minRadius, maxRadius } = config;
    const centerX = width / 2;
    const centerY = height / 2;

    // Group nodes by tier
    const nodesByTier = groupNodesByTier(networkData.nodes);
    const tiers = Array.from(nodesByTier.keys()).sort((a, b) => a - b);
    
    if (tiers.length === 0) return null;

    // Calculate radius for each tier
    const radiusStep = (maxRadius - minRadius) / Math.max(tiers.length - 1, 1);
    
    // Create circular nodes with positions
    const circularNodes: CircularNode[] = [];
    const circularTiers: CircularTier[] = [];

    tiers.forEach((tier, tierIndex) => {
      const nodes = nodesByTier.get(tier)!;
      const radius = minRadius + tierIndex * radiusStep;
      
      // Apply zoom filtering if needed
      let filteredNodes = nodes;
      if (zoomState.level === 2 && zoomState.focusedTier !== null) {
        // Focus on specific tier
        if (tier !== zoomState.focusedTier) {
          filteredNodes = [];
        }
      } else if (zoomState.level === 3 && zoomState.focusedLeague !== null) {
        // Focus on specific league
        filteredNodes = nodes.filter(node => node.league === zoomState.focusedLeague);
      }

      const positions = calculateCircularPositions(
        filteredNodes.length,
        radius,
        centerX,
        centerY,
        rotation
      );

      const tierNodes: CircularNode[] = filteredNodes.map((node, nodeIndex) => {
        const position = positions[nodeIndex];
        return {
          id: node.id,
          name: node.name,
          league: node.league,
          tier,
          angle: position.angle,
          radius,
          transferCount: node.stats.transfersIn + node.stats.transfersOut,
          totalValue: node.stats.totalSpent + node.stats.totalReceived,
          x: position.x,
          y: position.y,
          originalData: node
        };
      });

      circularNodes.push(...tierNodes);
      circularTiers.push({
        tier,
        radius,
        nodeCount: tierNodes.length,
        nodes: tierNodes
      });
    });

    // Create arcs for transfers
    const arcs: CircularArc[] = [];
    const nodeMap = new Map(circularNodes.map(n => [n.id, n]));

    networkData.edges.forEach(edge => {
      const sourceNode = nodeMap.get(typeof edge.source === 'string' ? edge.source : edge.source.id);
      const targetNode = nodeMap.get(typeof edge.target === 'string' ? edge.target : edge.target.id);

      if (sourceNode && targetNode) {
        const type = sourceNode.tier < targetNode.tier ? 'outward' : 
                    sourceNode.tier > targetNode.tier ? 'inward' : 'same-tier';

        arcs.push({
          source: sourceNode,
          target: targetNode,
          value: edge.stats.totalValue,
          count: edge.stats.transferCount,
          type,
          originalEdge: edge
        });
      }
    });

    return {
      nodes: circularNodes,
      arcs,
      tiers: circularTiers,
      centerX,
      centerY,
      maxRadius,
      minRadius
    };

  }, [networkData, config, rotation, zoomState]);
};