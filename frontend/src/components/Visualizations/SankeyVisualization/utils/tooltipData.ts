import { NetworkData, NetworkNode, NetworkEdge } from '../../../../types';
import { NodeTooltipData, FlowTooltipData } from '../components/SankeyTooltip';
import { formatCurrency, formatPercentage } from '../../../../utils';



export const createNodeTooltipData = (
  nodeId: string,
  nodeName: string,
  networkData: NetworkData,
  aggregationLevel: 'club' | 'league' | 'country' | 'continent'
): NodeTooltipData | null => {
  if (!networkData) return null;

  // Find relevant nodes and edges for this aggregated node
  let relevantNodes: NetworkNode[] = [];
  let relevantEdges: NetworkEdge[] = [];

  switch (aggregationLevel) {
    case 'club':
      relevantNodes = networkData.nodes.filter(n => n.name === nodeName);
      break;
    case 'league':
      relevantNodes = networkData.nodes.filter(n => n.league === nodeName);
      break;
    case 'country':
      relevantNodes = networkData.nodes.filter(n => n.country === nodeName);
      break;
    case 'continent':
      relevantNodes = networkData.nodes.filter(n => n.continent === nodeName);
      break;
  }

  if (relevantNodes.length === 0) return null;

  const relevantNodeIds = new Set(relevantNodes.map(n => n.id));

  // Find edges involving these nodes
  relevantEdges = networkData.edges.filter(edge => {
    const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
    const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
    return relevantNodeIds.has(sourceId) || relevantNodeIds.has(targetId);
  });

  // Calculate statistics
  let transfersIn = 0;
  let transfersOut = 0;
  let totalSpent = 0;
  let totalReceived = 0;
  let totalTransfers = 0;
  let successfulTransfers = 0;

  relevantEdges.forEach(edge => {
    const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
    const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
    
    if (relevantNodeIds.has(targetId)) {
      // Incoming transfers
      transfersIn += edge.transfers.length;
      totalSpent += edge.stats.totalValue;
    }
    
    if (relevantNodeIds.has(sourceId)) {
      // Outgoing transfers
      transfersOut += edge.transfers.length;
      totalReceived += edge.stats.totalValue;
    }
    
    totalTransfers += edge.transfers.length;
    // Calculate successful transfers based on transferSuccessRate
    successfulTransfers += Math.round((edge.stats.transferSuccessRate / 100) * edge.transfers.length);
  });

  const netSpend = totalSpent - totalReceived;
  const avgTransferValue = totalTransfers > 0 ? (totalSpent + totalReceived) / totalTransfers : 0;
  const successRate = totalTransfers > 0 ? (successfulTransfers / totalTransfers) * 100 : 0;

  // Get league information (use first relevant node's league)
  const firstNode = relevantNodes[0];
  const league = aggregationLevel === 'club' ? firstNode.league : 
                 aggregationLevel === 'league' ? firstNode.country :
                 aggregationLevel === 'country' ? firstNode.continent :
                 'Global';

  return {
    clubName: nodeName,
    league: league || 'Unknown',
    transfersIn,
    transfersOut,
    totalSpent: formatCurrency(totalSpent),
    totalReceived: formatCurrency(totalReceived),
    netSpend: netSpend >= 0 ? formatCurrency(netSpend) : `-${formatCurrency(Math.abs(netSpend))}`,
    avgTransferValue: formatCurrency(avgTransferValue),
    successRate: formatPercentage(successRate)
  };
};

export const createFlowTooltipData = (
  sourceNodeName: string,
  targetNodeName: string,
  networkData: NetworkData,
  aggregationLevel: 'club' | 'league' | 'country' | 'continent'
): FlowTooltipData | null => {
  if (!networkData) return null;

  // Find relevant edges for this flow
  let relevantEdges: NetworkEdge[] = [];
  const nodeMap = new Map(networkData.nodes.map(n => [n.id, n]));

  // Filter edges based on aggregation level
  networkData.edges.forEach(edge => {
    const sourceNode = nodeMap.get(typeof edge.source === 'string' ? edge.source : edge.source.id);
    const targetNode = nodeMap.get(typeof edge.target === 'string' ? edge.target : edge.target.id);
    
    if (!sourceNode || !targetNode) return;

    let sourceCategory: string;
    let targetCategory: string;

    switch (aggregationLevel) {
      case 'club':
        sourceCategory = sourceNode.name;
        targetCategory = targetNode.name;
        break;
      case 'league':
        sourceCategory = sourceNode.league || 'Unknown';
        targetCategory = targetNode.league || 'Unknown';
        break;
      case 'country':
        sourceCategory = sourceNode.country || 'Unknown';
        targetCategory = targetNode.country || 'Unknown';
        break;
      case 'continent':
        sourceCategory = sourceNode.continent || 'Unknown';
        targetCategory = targetNode.continent || 'Unknown';
        break;
    }

    if (sourceCategory === sourceNodeName && targetCategory === targetNodeName) {
      relevantEdges.push(edge);
    }
  });

  if (relevantEdges.length === 0) return null;

  // Aggregate statistics
  let totalValue = 0;
  let totalTransfers = 0;
  let successfulTransfers = 0;
  let allTransfers: any[] = [];
  let transferTypes = new Set<string>();

  relevantEdges.forEach(edge => {
    totalValue += edge.stats.totalValue;
    totalTransfers += edge.transfers.length;
    successfulTransfers += Math.round((edge.stats.transferSuccessRate / 100) * edge.transfers.length);
    
    edge.transfers.forEach(transfer => {
      allTransfers.push({
        playerName: transfer.playerName,
        transferFee: transfer.transferFee,
        date: transfer.date,
        transferType: transfer.transferType
      });
      transferTypes.add(transfer.transferType);
    });
  });

  const avgValue = totalTransfers > 0 ? totalValue / totalTransfers : 0;
  const successRate = totalTransfers > 0 ? (successfulTransfers / totalTransfers) * 100 : 0;

  // Find top transfer
  const topTransfer = allTransfers
    .filter(t => t.transferFee !== null && t.transferFee > 0)
    .sort((a, b) => (b.transferFee || 0) - (a.transferFee || 0))[0];

  return {
    from: sourceNodeName,
    to: targetNodeName,
    transferCount: totalTransfers,
    totalValue: formatCurrency(totalValue),
    avgValue: formatCurrency(avgValue),
    topTransfer: topTransfer ? {
      player: topTransfer.playerName,
      fee: formatCurrency(topTransfer.transferFee || 0),
      date: new Date(topTransfer.date).toLocaleDateString()
    } : null,
    transferTypes: Array.from(transferTypes),
    successRate: formatPercentage(successRate)
  };
};