import { NetworkData, SankeyNode, SankeyLink, NetworkNode, SankeyTransformResult } from '../types';

export type AggregationLevel = 'club' | 'league' | 'country' | 'continent';
export type FlowType = 'bidirectional' | 'net';

interface FlowData {
  source: string;
  target: string;
  value: number;
  transfers: Array<{
    playerName: string;
    transferFee: number | null;
    date: string;
  }>;
}

/**
 * Detects and breaks cycles by removing the weakest links
 */
export const detectAndBreakCycles = (nodes: SankeyNode[], links: SankeyLink[]): SankeyLink[] => {
  const graph = new Map<string, { target: string; value: number; linkIndex: number }[]>();
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const linksToRemove = new Set<number>();

  // Build adjacency list with link indices
  nodes.forEach(node => graph.set(node.id, []));
  links.forEach((link, index) => {
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;
    
    if (graph.has(sourceId) && graph.has(targetId)) {
      graph.get(sourceId)?.push({ target: targetId, value: link.value, linkIndex: index });
    }
  });

  const findCycleAndBreak = (nodeId: string, path: { node: string; linkIndex: number; value: number }[]): boolean => {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = graph.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (linksToRemove.has(neighbor.linkIndex)) continue; // Skip already removed links
      
      const currentPath = [...path, { node: nodeId, linkIndex: neighbor.linkIndex, value: neighbor.value }];
      
      if (!visited.has(neighbor.target)) {
        if (findCycleAndBreak(neighbor.target, currentPath)) return true;
      } else if (recursionStack.has(neighbor.target)) {
        // Cycle found! Find the weakest link in the cycle
        const cycleStartIndex = currentPath.findIndex(p => p.node === neighbor.target);
        const cycleLinks = currentPath.slice(cycleStartIndex);
        cycleLinks.push({ node: neighbor.target, linkIndex: neighbor.linkIndex, value: neighbor.value });
        
        // Find the link with minimum value in the cycle
        const weakestLink = cycleLinks.reduce((min, link) => 
          link.value < min.value ? link : min
        );
        
        console.log(`Breaking cycle by removing link with value ${weakestLink.value} (index: ${weakestLink.linkIndex})`);
        linksToRemove.add(weakestLink.linkIndex);
        return true; // Cycle found and broken
      }
    }

    recursionStack.delete(nodeId);
    return false;
  };

  // Keep finding and breaking cycles until no more cycles exist
  let cyclesFound = false;
  do {
    visited.clear();
    recursionStack.clear();
    cyclesFound = false;
    
    for (const nodeId of Array.from(graph.keys())) {
      if (!visited.has(nodeId)) {
        if (findCycleAndBreak(nodeId, [])) {
          cyclesFound = true;
          break; // Start over after breaking a cycle
        }
      }
    }
  } while (cyclesFound);

  // Return links with cycles removed
  return links.filter((_, index) => !linksToRemove.has(index));
};

/**
 * Detects cycles in the flow data to ensure DAG compatibility
 */
export const detectCycles = (nodes: SankeyNode[], links: SankeyLink[]): boolean => {
  const graph = new Map<string, string[]>();
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  // Build adjacency list
  nodes.forEach(node => graph.set(node.id, []));
  links.forEach(link => {
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;
    
    // Only add to graph if both nodes exist
    if (graph.has(sourceId) && graph.has(targetId)) {
      graph.get(sourceId)?.push(targetId);
    }
  });

  const dfs = (nodeId: string): boolean => {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = graph.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        return true; // Cycle found
      }
    }

    recursionStack.delete(nodeId);
    return false;
  };

  // Check for cycles starting from each unvisited node
  for (const nodeId of Array.from(graph.keys())) {
    if (!visited.has(nodeId)) {
      if (dfs(nodeId)) return true;
    }
  }

  return false;
};

/**
 * Extracts the appropriate category value from a network node based on aggregation level
 */
export const extractCategory = (node: NetworkNode, level: AggregationLevel): string => {
  switch (level) {
    case 'club':
      return node.name;
    case 'league':
      return node.league || 'Unknown League';
    case 'country':
      return node.country || 'Unknown Country';
    case 'continent':
      return node.continent || 'Unknown Continent';
    default:
      return node.name;
  }
};

/**
 * Aggregates transfers by the specified level
 */
export const aggregateByLevel = (
  networkData: NetworkData, 
  level: AggregationLevel,
  valueType: 'sum' | 'count' = 'sum'
): FlowData[] => {
  const flows = new Map<string, FlowData>();
  const nodeMap = new Map(networkData.nodes.map(n => [n.id, n]));

  networkData.edges.forEach(edge => {
    const sourceNode = nodeMap.get(typeof edge.source === 'string' ? edge.source : edge.source.id);
    const targetNode = nodeMap.get(typeof edge.target === 'string' ? edge.target : edge.target.id);

    if (!sourceNode || !targetNode) return;

    const sourceCategory = extractCategory(sourceNode, level);
    const targetCategory = extractCategory(targetNode, level);
    
    // Skip self-loops at aggregation level to avoid cycles
    if (sourceCategory === targetCategory) return;

    const flowKey = `${sourceCategory}→${targetCategory}`;
    
    if (!flows.has(flowKey)) {
      flows.set(flowKey, {
        source: sourceCategory,
        target: targetCategory,
        value: 0,
        transfers: []
      });
    }

    const flow = flows.get(flowKey)!;
    
    // Add value based on type: sum of transfer values or count of transfers
    if (valueType === 'count') {
      flow.value += edge.transfers.length;
    } else {
      flow.value += edge.stats?.totalValue || 0;
    }
    
    // Add transfer details
    edge.transfers.forEach(transfer => {
      flow.transfers.push({
        playerName: transfer.playerName,
        transferFee: transfer.transferFee,
        date: transfer.date.toString()
      });
    });
  });

  return Array.from(flows.values());
};

/**
 * Creates bidirectional flows (A→B and B→A as separate flows)
 */
export const createBidirectionalFlows = (
  networkData: NetworkData, 
  level: AggregationLevel,
  valueType: 'sum' | 'count' = 'sum'
): SankeyTransformResult => {
  const flows = aggregateByLevel(networkData, level, valueType);
  
  // For bidirectional, we add direction suffix to avoid cycles
  const nodes = new Map<string, SankeyNode>();
  const links: SankeyLink[] = [];
  
  flows.forEach(flow => {
    const sourceOutId = `${flow.source} (Out)`;
    const targetInId = `${flow.target} (In)`;
    
    // Create nodes
    if (!nodes.has(sourceOutId)) {
      nodes.set(sourceOutId, {
        id: sourceOutId,
        name: flow.source,
        category: `${level}_out`,
        value: 0
      });
    }
    
    if (!nodes.has(targetInId)) {
      nodes.set(targetInId, {
        id: targetInId,
        name: flow.target,
        category: `${level}_in`,
        value: 0
      });
    }
    
    // Update node values
    nodes.get(sourceOutId)!.value += flow.value;
    nodes.get(targetInId)!.value += flow.value;
    
    // Create link
    links.push({
      source: sourceOutId,
      target: targetInId,
      value: flow.value
    });
  });
  
  const nodeArray = Array.from(nodes.values());
  const hasCycles = detectCycles(nodeArray, links);
  
  return {
    nodes: nodeArray,
    links,
    stats: {
      originalNodeCount: networkData.nodes.length,
      originalLinkCount: networkData.edges.length,
      transformedNodeCount: nodeArray.length,
      transformedLinkCount: links.length,
      totalValue: links.reduce((sum, link) => sum + link.value, 0),
      hasCycles
    }
  };
};

/**
 * Creates net flows (combines A→B and B→A into single net flow)
 */
export const createNetFlows = (
  networkData: NetworkData, 
  level: AggregationLevel,
  valueType: 'sum' | 'count' = 'sum'
): SankeyTransformResult => {
  const flows = aggregateByLevel(networkData, level, valueType);
  
  // Aggregate opposing flows
  const netFlows = new Map<string, { source: string; target: string; value: number; }>();
  
  flows.forEach(flow => {
    const forwardKey = `${flow.source}→${flow.target}`;
    const reverseKey = `${flow.target}→${flow.source}`;
    
    if (netFlows.has(reverseKey)) {
      // We have the reverse flow, calculate net
      const reverse = netFlows.get(reverseKey)!;
      const netValue = flow.value - reverse.value;
      
      if (netValue > 0) {
        // Current flow dominates - remove reverse and add forward
        netFlows.delete(reverseKey);
        netFlows.set(forwardKey, {
          source: flow.source,
          target: flow.target,
          value: netValue
        });
      } else if (netValue < 0) {
        // Reverse flow dominates - keep reverse, update value
        reverse.value = -netValue;
      } else {
        // Flows cancel out, remove reverse
        netFlows.delete(reverseKey);
      }
    } else {
      // New flow
      netFlows.set(forwardKey, {
        source: flow.source,
        target: flow.target,
        value: flow.value
      });
    }
  });
  
  // Create nodes from remaining flows
  const nodeSet = new Set<string>();
  netFlows.forEach(flow => {
    nodeSet.add(flow.source);
    nodeSet.add(flow.target);
  });
  
  const nodes = Array.from(nodeSet).map(name => ({
    id: name,
    name,
    category: level,
    value: 0
  }));
  
  // Calculate node values and create initial links
  const nodeValueMap = new Map<string, number>();
  let links: SankeyLink[] = [];
  
  netFlows.forEach(flow => {
    if (flow.value <= 0) return; // Skip zero or negative flows
    
    nodeValueMap.set(flow.source, (nodeValueMap.get(flow.source) || 0) + flow.value);
    nodeValueMap.set(flow.target, (nodeValueMap.get(flow.target) || 0) + flow.value);
    
    links.push({
      source: flow.source,
      target: flow.target,
      value: flow.value
    });
  });
  
  // Break cycles by removing weakest links
  const originalLinkCount = links.length;
  links = detectAndBreakCycles(nodes, links);
  const removedLinkCount = originalLinkCount - links.length;
  
  if (removedLinkCount > 0) {
    console.log(`[createNetFlows] ${level} level - Removed ${removedLinkCount} links to break cycles`);
    
    // Recalculate node values after removing links
    nodeValueMap.clear();
    links.forEach(link => {
      nodeValueMap.set(link.source as string, (nodeValueMap.get(link.source as string) || 0) + link.value);
      nodeValueMap.set(link.target as string, (nodeValueMap.get(link.target as string) || 0) + link.value);
    });
  }
  
  // Update node values
  nodes.forEach(node => {
    node.value = nodeValueMap.get(node.name) || 0;
  });
  
  // Filter out nodes that are no longer connected after cycle breaking
  const connectedNodes = new Set<string>();
  links.forEach(link => {
    connectedNodes.add(link.source as string);
    connectedNodes.add(link.target as string);
  });
  const filteredNodes = nodes.filter(node => connectedNodes.has(node.name));
  
  const hasCycles = detectCycles(filteredNodes, links);
  
  return {
    nodes: filteredNodes,
    links,
    stats: {
      originalNodeCount: networkData.nodes.length,
      originalLinkCount: networkData.edges.length,
      transformedNodeCount: filteredNodes.length,
      transformedLinkCount: links.length,
      totalValue: links.reduce((sum, link) => sum + link.value, 0),
      hasCycles
    }
  };
};

/**
 * Main transformation function that handles both bidirectional and net flows
 */
export const transformNetworkDataToSankey = (
  networkData: NetworkData, 
  level: AggregationLevel, 
  flowType: FlowType,
  valueType: 'sum' | 'count' = 'sum'
): SankeyTransformResult => {
  try {
    if (flowType === 'bidirectional') {
      return createBidirectionalFlows(networkData, level, valueType);
    } else {
      return createNetFlows(networkData, level, valueType);
    }
  } catch (error) {
    console.error('Error transforming network data to Sankey:', error);
    return {
      nodes: [],
      links: [],
      stats: {
        originalNodeCount: networkData?.nodes?.length || 0,
        originalLinkCount: networkData?.edges?.length || 0,
        transformedNodeCount: 0,
        transformedLinkCount: 0,
        totalValue: 0,
        hasCycles: false
      }
    };
  }
};