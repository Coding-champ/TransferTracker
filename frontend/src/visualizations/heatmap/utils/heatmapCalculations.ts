import { NetworkData } from '../../../types/index';
import { HeatmapData, HeatmapCell, DrillDownState } from '../types';

export const calculateHeatmapMatrix = (
  networkData: NetworkData,
  drillDownState: DrillDownState
): HeatmapData => {
  const { nodes, edges } = networkData;
  
  console.log('calculateHeatmapMatrix: nodes length', nodes?.length);
  console.log('calculateHeatmapMatrix: edges length', edges?.length);
  console.log('calculateHeatmapMatrix: drillDownState', drillDownState);
  
  if (!nodes?.length || !edges?.length) {
    console.log('calculateHeatmapMatrix: No data, returning empty matrix');
    return { matrix: [], labels: [], maxValue: 0, maxCount: 0 };
  }

  let labels: string[] = [];
  let entityMap = new Map<string, number>();

  // Determine what entities to use based on drill-down level
  if (drillDownState.level === 'league') {
    // Group by league
    const leagues = Array.from(new Set(nodes.map(node => node.league)));
    labels = leagues.sort();
    labels.forEach((league, index) => {
      entityMap.set(league, index);
    });
  } else if (drillDownState.level === 'club') {
    // Filter to specific leagues and show clubs
    let filteredNodes = nodes;
    if (drillDownState.sourceFilter || drillDownState.targetFilter) {
      filteredNodes = nodes.filter(node => 
        (drillDownState.sourceFilter ? node.league === drillDownState.sourceFilter : true) ||
        (drillDownState.targetFilter ? node.league === drillDownState.targetFilter : true)
      );
    }
    
    labels = filteredNodes.map(node => node.name).sort();
    labels.forEach((club, index) => {
      entityMap.set(club, index);
    });
  }

  // Initialize matrices
  const size = labels.length;
  const valueMatrix: number[][] = Array(size).fill(null).map(() => Array(size).fill(0));
  const countMatrix: number[][] = Array(size).fill(null).map(() => Array(size).fill(0));
  const successMatrix: number[][] = Array(size).fill(null).map(() => Array(size).fill(0));
  const transferDetails: Map<string, any[]> = new Map();

  // Create node lookup
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // Process edges
  edges.forEach(edge => {
    const sourceNode = nodeMap.get(typeof edge.source === 'string' ? edge.source : edge.source.id);
    const targetNode = nodeMap.get(typeof edge.target === 'string' ? edge.target : edge.target.id);

    if (!sourceNode || !targetNode) return;

    let sourceKey: string;
    let targetKey: string;

    if (drillDownState.level === 'league') {
      sourceKey = sourceNode.league;
      targetKey = targetNode.league;
    } else {
      sourceKey = sourceNode.name;
      targetKey = targetNode.name;
    }

    const sourceIndex = entityMap.get(sourceKey);
    const targetIndex = entityMap.get(targetKey);

    if (sourceIndex !== undefined && targetIndex !== undefined) {
      valueMatrix[sourceIndex][targetIndex] += edge.stats.totalValue;
      countMatrix[sourceIndex][targetIndex] += edge.stats.transferCount;
      // Calculate successful transfers from success rate and transfer count
      const successfulCount = edge.stats.successRate 
        ? Math.round(edge.stats.transferCount * edge.stats.successRate)
        : 0;
      successMatrix[sourceIndex][targetIndex] += successfulCount;

      // Store transfer details for tooltip
      const key = `${sourceIndex}-${targetIndex}`;
      if (!transferDetails.has(key)) {
        transferDetails.set(key, []);
      }
      transferDetails.get(key)!.push(edge);
    }
  });

  // Create matrix cells
  const matrix: HeatmapCell[] = [];
  let maxValue = 0;
  let maxCount = 0;

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const value = valueMatrix[i][j];
      const count = countMatrix[i][j];
      const successCount = successMatrix[i][j];

      if (value > 0 || count > 0) {
        const cell: HeatmapCell = {
          source: labels[i],
          target: labels[j],
          value,
          count,
          sourceIndex: i,
          targetIndex: j,
          successRate: count > 0 ? successCount / count : 0
        };

        // Find top transfer for this cell
        const key = `${i}-${j}`;
        const cellTransfers = transferDetails.get(key) || [];
        if (cellTransfers.length > 0) {
          const topTransfer = cellTransfers.reduce((max, transfer) => 
            transfer.stats.totalValue > max.stats.totalValue ? transfer : max
          );
          
          // This would need actual player data - for now use a placeholder
          cell.topTransfer = {
            player: `Top Transfer ${i}-${j}`,
            value: topTransfer.stats.totalValue
          };
        }

        matrix.push(cell);
        maxValue = Math.max(maxValue, value);
        maxCount = Math.max(maxCount, count);
      }
    }
  }

  return { matrix, labels, maxValue, maxCount };
};

export const filterMatrixByValue = (
  matrix: HeatmapCell[],
  minValue: number
): HeatmapCell[] => {
  return matrix.filter(cell => cell.value >= minValue);
};

export const filterMatrixByCount = (
  matrix: HeatmapCell[],
  minCount: number
): HeatmapCell[] => {
  return matrix.filter(cell => cell.count >= minCount);
};

export const aggregateMatrixData = (matrix: HeatmapCell[]) => {
  const totalValue = matrix.reduce((sum, cell) => sum + cell.value, 0);
  const totalCount = matrix.reduce((sum, cell) => sum + cell.count, 0);
  const avgSuccessRate = matrix.length > 0 
    ? matrix.reduce((sum, cell) => sum + (cell.successRate || 0), 0) / matrix.length 
    : 0;

  return {
    totalValue,
    totalCount,
    avgSuccessRate,
    cellCount: matrix.length
  };
};

export const findOptimalCellSize = (
  containerWidth: number,
  containerHeight: number,
  labelsCount: number,
  margin: { top: number; right: number; bottom: number; left: number }
): number => {
  const availableWidth = containerWidth - margin.left - margin.right;
  const availableHeight = containerHeight - margin.top - margin.bottom;
  
  const maxCellSize = Math.min(
    availableWidth / labelsCount,
    availableHeight / labelsCount
  );
  
  return Math.max(10, maxCellSize); // Minimum cell size of 10px
};