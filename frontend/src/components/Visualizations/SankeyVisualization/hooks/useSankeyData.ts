import { useMemo } from 'react';
import { NetworkData } from '../../../../types';

export type GroupingMode = 'continent' | 'league' | 'position';

interface SankeyData {
  nodes: Array<{
    id: string;
    name: string;
    category: string;
    value: number;
  }>;
  links: Array<{
    source: number;
    target: number;
    value: number;
    sourceCategory: string;
    targetCategory: string;
  }>;
  hasValidData: boolean;
}

export const useSankeyData = (networkData: NetworkData | null, groupingMode: GroupingMode): SankeyData => {
  return useMemo(() => {
    if (!networkData?.edges || !networkData?.nodes || networkData.edges.length === 0) {
      return { nodes: [], links: [], hasValidData: false };
    }
    
    try {
      const nodeMap = new Map(networkData.nodes.map(n => [n.id, n]));
      const flowData = new Map<string, number>();
      
      // Process transfers based on grouping mode
      networkData.edges.forEach(edge => {
        const sourceNode = nodeMap.get(typeof edge.source === 'string' ? edge.source : edge.source.id);
        const targetNode = nodeMap.get(typeof edge.target === 'string' ? edge.target : edge.target.id);
        
        if (!sourceNode || !targetNode || !edge.stats?.totalValue) return;
        
        let sourceCategory: string;
        let targetCategory: string;
        
        switch (groupingMode) {
          case 'continent':
            sourceCategory = sourceNode.continent || 'Unknown';
            targetCategory = targetNode.continent || 'Unknown';
            break;
          case 'league':
            sourceCategory = sourceNode.league || 'Unknown';
            targetCategory = targetNode.league || 'Unknown';
            break;
          case 'position':
            // For position, we'll show tier-based flows 
            const sourceTier = sourceNode.leagueTier || 1;
            const targetTier = targetNode.leagueTier || 1;
            sourceCategory = `Tier ${sourceTier}`;
            targetCategory = `Tier ${targetTier}`;
            break;
          default:
            sourceCategory = sourceNode.league || 'Unknown';
            targetCategory = targetNode.league || 'Unknown';
        }
        
        // Allow flows within same category for better visualization
        // but distinguish them by adding direction info for same-category flows
        let flowKey: string;
        if (sourceCategory === targetCategory && groupingMode !== 'position') {
          // For same-category flows, create internal circulation
          flowKey = `${sourceCategory} (Internal)→${targetCategory} (Internal)`;
        } else {
          flowKey = `${sourceCategory}→${targetCategory}`;
        }
        
        flowData.set(flowKey, (flowData.get(flowKey) || 0) + edge.stats.totalValue);
      });
      
      if (flowData.size === 0) {
        return { nodes: [], links: [], hasValidData: false };
      }
      
      // Create unique nodes
      const nodeSet = new Set<string>();
      flowData.forEach((value, key) => {
        const [source, target] = key.split('→');
        nodeSet.add(source);
        nodeSet.add(target);
      });
      
      const nodes = Array.from(nodeSet).map(name => ({
        id: name,
        name,
        category: groupingMode,
        value: 0
      }));
      
      // Calculate node values
      const nodeValueMap = new Map<string, number>();
      flowData.forEach((value, key) => {
        const [source, target] = key.split('→');
        nodeValueMap.set(source, (nodeValueMap.get(source) || 0) + value);
        nodeValueMap.set(target, (nodeValueMap.get(target) || 0) + value);
      });
      
      nodes.forEach(node => {
        node.value = nodeValueMap.get(node.name) || 0;
      });
      
      // Create links
      const links: any[] = [];
      flowData.forEach((value, key) => {
        const [sourceName, targetName] = key.split('→');
        const sourceIndex = nodes.findIndex(n => n.name === sourceName);
        const targetIndex = nodes.findIndex(n => n.name === targetName);
        
        if (sourceIndex !== -1 && targetIndex !== -1 && value > 0) {
          links.push({
            source: sourceIndex,
            target: targetIndex,
            value,
            sourceCategory: sourceName,
            targetCategory: targetName
          });
        }
      });
      
      return { nodes, links, hasValidData: nodes.length > 0 && links.length > 0 };
    } catch (error) {
      console.error('Error processing Sankey data:', error);
      return { nodes: [], links: [], hasValidData: false };
    }
  }, [networkData, groupingMode]);
};