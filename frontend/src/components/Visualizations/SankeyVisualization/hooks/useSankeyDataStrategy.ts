import { useMemo } from 'react';
import { NetworkData, SankeyData, SankeyStrategy, SankeyTransformResult, SankeyStrategyConfig } from '../../../../types';
import { SANKEY_STRATEGIES, DEFAULT_STRATEGY, getStrategyById } from '../strategies';
import { transformNetworkDataToSankey } from '../../../../utils/sankeyTransformations';

interface UseSankeyDataResult {
  sankeyData: SankeyData | null;
  transformResult: SankeyTransformResult | null;
  isLoading: boolean;
  error: string | null;
  availableStrategies: SankeyStrategy[];
  currentStrategy: SankeyStrategy;
  hasValidData: boolean;
}

/**
 * Enhanced hook for processing Sankey data with strategy support
 */
export const useSankeyData = (
  networkData: NetworkData | null,
  strategyConfig: SankeyStrategyConfig
): UseSankeyDataResult => {
  
  // Get current strategy
  const currentStrategy = useMemo(() => {
    return getStrategyById(strategyConfig.selectedStrategy) || DEFAULT_STRATEGY;
  }, [strategyConfig.selectedStrategy]);

  // Transform data with memoization
  const transformResult = useMemo((): SankeyTransformResult | null => {
    if (!networkData?.edges || !networkData?.nodes || networkData.edges.length === 0) {
      return null;
    }

    try {
      return transformNetworkDataToSankey(
        networkData,
        currentStrategy.aggregationLevel,
        currentStrategy.flowType
      );
    } catch (error) {
      console.error('Error transforming Sankey data:', error);
      return null;
    }
  }, [networkData, currentStrategy]);

  // Create Sankey data
  const sankeyData = useMemo((): SankeyData | null => {
    if (!transformResult || transformResult.nodes.length === 0) {
      return null;
    }

    // Apply custom settings if provided
    let filteredLinks = transformResult.links;
    
    if (strategyConfig.customSettings?.minimumFlowValue) {
      filteredLinks = filteredLinks.filter(
        (link: any) => link.value >= strategyConfig.customSettings!.minimumFlowValue!
      );
    }

    if (!strategyConfig.customSettings?.showSelfLoops) {
      filteredLinks = filteredLinks.filter((link: any) => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;
        return sourceId !== targetId;
      });
    }

    // Filter nodes that still have connections after link filtering
    const connectedNodeIds = new Set<string>();
    filteredLinks.forEach((link: any) => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      connectedNodeIds.add(sourceId);
      connectedNodeIds.add(targetId);
    });

    const filteredNodes = transformResult.nodes.filter((node: any) => 
      connectedNodeIds.has(node.id)
    );

    return {
      nodes: filteredNodes,
      links: filteredLinks,
      groupBy: currentStrategy.aggregationLevel
    };
  }, [transformResult, strategyConfig.customSettings, currentStrategy.aggregationLevel]);

  // Check for errors
  const error = useMemo(() => {
    if (!networkData) return 'No network data available';
    if (transformResult?.stats.hasCycles) return 'Circular dependencies detected in data';
    if (sankeyData && sankeyData.nodes.length === 0) return 'No valid flows found with current strategy';
    return null;
  }, [networkData, transformResult, sankeyData]);

  const hasValidData = sankeyData !== null && sankeyData.nodes.length > 0 && sankeyData.links.length > 0;

  return {
    sankeyData,
    transformResult,
    isLoading: false, // Since we're processing synchronously
    error,
    availableStrategies: SANKEY_STRATEGIES,
    currentStrategy,
    hasValidData
  };
};

/**
 * Hook for getting strategy preview data
 */
export const useStrategyPreview = (
  networkData: NetworkData | null,
  strategy: SankeyStrategy
) => {
  return useMemo(() => {
    if (!networkData?.edges || !networkData?.nodes) {
      return {
        nodeCount: 0,
        linkCount: 0,
        totalValue: 0,
        hasData: false
      };
    }

    try {
      const result = transformNetworkDataToSankey(
        networkData,
        strategy.aggregationLevel,
        strategy.flowType
      );

      return {
        nodeCount: result.nodes.length,
        linkCount: result.links.length,
        totalValue: result.stats.totalValue,
        hasData: result.nodes.length > 0,
        hasCycles: result.stats.hasCycles
      };
    } catch (error) {
      return {
        nodeCount: 0,
        linkCount: 0,
        totalValue: 0,
        hasData: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, [networkData, strategy]);
};