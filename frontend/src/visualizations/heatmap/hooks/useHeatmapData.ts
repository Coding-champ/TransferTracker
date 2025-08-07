import { useMemo } from 'react';
import { NetworkData } from '../../../types';
import { HeatmapData, UseHeatmapDataProps } from '../types';
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
        edge.stats.seasons.some(season => filters.seasons.includes(season))
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
        edge.stats.types.some(type => filters.transferTypes.includes(type))
      );
    }

    // Apply value range filter
    if (filters.minTransferFee !== undefined || filters.maxTransferFee !== undefined) {
      const min = filters.minTransferFee ?? 0;
      const max = filters.maxTransferFee ?? Infinity;
      filteredEdges = filteredEdges.filter(edge => 
        edge.stats.totalValue >= min && edge.stats.totalValue <= max
      );
    }

    // Apply age range filter
    if (filters.minPlayerAge !== undefined || filters.maxPlayerAge !== undefined) {
      const minAge = filters.minPlayerAge ?? 0;
      const maxAge = filters.maxPlayerAge ?? Infinity;
      filteredEdges = filteredEdges.filter(edge => 
        edge.transfers.some(transfer => 
          transfer.playerAge !== undefined && 
          transfer.playerAge >= minAge && 
          transfer.playerAge <= maxAge
        )
      );
    }

    const filteredNetworkData: NetworkData = {
      nodes: filteredNodes,
      edges: filteredEdges,
      metadata: {
        totalTransfers: filteredEdges.reduce((sum, edge) => sum + edge.stats.transferCount, 0),
        totalValue: filteredEdges.reduce((sum, edge) => sum + edge.stats.totalValue, 0),
        dateRange: {
          start: null, // Could be calculated from transfer dates if needed
          end: null
        },
        clubCount: filteredNodes.length,
        edgeCount: filteredEdges.length,
        avgROI: filteredEdges.length > 0 
          ? filteredEdges.reduce((sum, edge) => sum + (edge.stats.avgROI || 0), 0) / filteredEdges.length 
          : 0,
        successRate: filteredEdges.length > 0
          ? filteredEdges.reduce((sum, edge) => sum + (edge.stats.successRate || 0), 0) / filteredEdges.length
          : 0,
        filters
      }
    };

    return calculateHeatmapMatrix(filteredNetworkData, drillDownState);
  }, [networkData, filters, drillDownState]);
};