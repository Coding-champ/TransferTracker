import { useMemo } from 'react';
import { NetworkData, Filters } from '../../../types';
import { HeatmapData, DrillDownState, UseHeatmapDataProps } from '../types';
import { calculateHeatmapMatrix } from '../utils/heatmapCalculations';

export const useHeatmapData = ({
  networkData,
  filters,
  drillDownState
}: UseHeatmapDataProps): HeatmapData | null => {
  return useMemo(() => {
    if (!networkData?.nodes?.length || !networkData?.edges?.length) {
      return null;
    }

    // Apply global filters to network data first
    let filteredNodes = networkData.nodes;
    let filteredEdges = networkData.edges;

    // Apply season filter
    if (filters.seasons?.length) {
      filteredEdges = filteredEdges.filter(edge => 
        filters.seasons.includes(edge.season)
      );
    }

    // Apply league filter
    if (filters.leagues?.length) {
      const filteredNodeIds = new Set(
        filteredNodes
          .filter(node => filters.leagues.includes(node.league))
          .map(node => node.id)
      );
      
      filteredEdges = filteredEdges.filter(edge => {
        const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
        const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
        return filteredNodeIds.has(sourceId) && filteredNodeIds.has(targetId);
      });
      
      filteredNodes = filteredNodes.filter(node => 
        filters.leagues.includes(node.league)
      );
    }

    // Apply transfer type filter
    if (filters.transferTypes?.length) {
      filteredEdges = filteredEdges.filter(edge => 
        filters.transferTypes.includes(edge.type)
      );
    }

    // Apply value range filter
    if (filters.valueRange) {
      const [min, max] = filters.valueRange;
      filteredEdges = filteredEdges.filter(edge => 
        edge.stats.totalValue >= min && edge.stats.totalValue <= max
      );
    }

    // Apply age range filter
    if (filters.ageRange) {
      const [minAge, maxAge] = filters.ageRange;
      filteredEdges = filteredEdges.filter(edge => 
        edge.averageAge >= minAge && edge.averageAge <= maxAge
      );
    }

    const filteredNetworkData: NetworkData = {
      nodes: filteredNodes,
      edges: filteredEdges
    };

    return calculateHeatmapMatrix(filteredNetworkData, drillDownState);
  }, [networkData, filters, drillDownState]);
};