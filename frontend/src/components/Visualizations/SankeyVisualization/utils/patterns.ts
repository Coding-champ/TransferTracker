import { NetworkEdge, NetworkNode } from '../../../../types';

export interface Pattern {
  id: string;
  name: string;
  description: string;
  color: string;
  strokeColor: string;
  condition: (edge: NetworkEdge, sourceNode?: NetworkNode, targetNode?: NetworkNode) => boolean;
}

export const SANKEY_PATTERNS: Pattern[] = [
  {
    id: 'loan_highways',
    name: 'Loan Highways',
    description: 'Frequent loan partnerships between clubs (3+ loans)',
    color: '#3B82F6',
    strokeColor: '#2563EB',
    condition: (edge: NetworkEdge) => {
      const loanCount = edge.transfers.filter(t => t.transferType === 'loan').length;
      return loanCount >= 3;
    }
  },
  {
    id: 'big_money_flows',
    name: 'Big Money Flows',
    description: 'High-value transfer corridors (>€50M total)',
    color: '#EF4444',
    strokeColor: '#DC2626',
    condition: (edge: NetworkEdge) => {
      return edge.stats.totalValue >= 50000000;
    }
  },
  {
    id: 'youth_talent_pipelines',
    name: 'Youth Talent Pipelines',
    description: 'Clubs developing young talent (2+ transfers of players ≤21)',
    color: '#10B981',
    strokeColor: '#059669',
    condition: (edge: NetworkEdge) => {
      const youthTransfers = edge.transfers.filter(t => {
        // Extract age from transfer if available
        const transferInfo = t as any;
        return transferInfo.playerAge && transferInfo.playerAge <= 21;
      }).length;
      return youthTransfers >= 2;
    }
  },
  {
    id: 'circular_trading',
    name: 'Circular Trading',
    description: 'Clubs that frequently trade with each other (5+ transfers)',
    color: '#8B5CF6',
    strokeColor: '#7C3AED',
    condition: (edge: NetworkEdge) => {
      return edge.transfers.length >= 5;
    }
  },
  {
    id: 'league_bridges',
    name: 'League Bridges',
    description: 'Key transfer routes between different leagues',
    color: '#F59E0B',
    strokeColor: '#D97706',
    condition: (edge: NetworkEdge, sourceNode?: NetworkNode, targetNode?: NetworkNode) => {
      if (!sourceNode || !targetNode) return false;
      return sourceNode.league !== targetNode.league && edge.transfers.length >= 3;
    }
  },
  {
    id: 'success_stories',
    name: 'Success Stories',
    description: 'Transfer routes with high success rates (≥75%)',
    color: '#059669',
    strokeColor: '#047857',
    condition: (edge: NetworkEdge) => {
      return edge.stats.transferSuccessRate >= 75;
    }
  }
];

export const getPatternById = (id: string): Pattern | undefined => {
  return SANKEY_PATTERNS.find(pattern => pattern.id === id);
};

export const detectPatterns = (edges: NetworkEdge[], nodes: NetworkNode[]): Map<string, NetworkEdge[]> => {
  const patternMatches = new Map<string, NetworkEdge[]>();
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  SANKEY_PATTERNS.forEach(pattern => {
    const matchingEdges: NetworkEdge[] = [];
    
    edges.forEach(edge => {
      const sourceNode = nodeMap.get(typeof edge.source === 'string' ? edge.source : edge.source.id);
      const targetNode = nodeMap.get(typeof edge.target === 'string' ? edge.target : edge.target.id);
      
      if (pattern.condition(edge, sourceNode, targetNode)) {
        matchingEdges.push(edge);
      }
    });
    
    if (matchingEdges.length > 0) {
      patternMatches.set(pattern.id, matchingEdges);
    }
  });

  return patternMatches;
};

export interface PatternStats {
  patternId: string;
  matchCount: number;
  totalValue: number;
  avgValue: number;
  topMatches: Array<{
    from: string;
    to: string;
    value: number;
    transferCount: number;
  }>;
}

export const calculatePatternStats = (
  patternMatches: Map<string, NetworkEdge[]>,
  nodes: NetworkNode[]
): PatternStats[] => {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  
  return Array.from(patternMatches.entries()).map(([patternId, edges]) => {
    const totalValue = edges.reduce((sum, edge) => sum + edge.stats.totalValue, 0);
    const avgValue = totalValue / edges.length;
    
    const topMatches = edges
      .map(edge => {
        const sourceNode = nodeMap.get(typeof edge.source === 'string' ? edge.source : edge.source.id);
        const targetNode = nodeMap.get(typeof edge.target === 'string' ? edge.target : edge.target.id);
        
        return {
          from: sourceNode?.name || 'Unknown',
          to: targetNode?.name || 'Unknown',
          value: edge.stats.totalValue,
          transferCount: edge.transfers.length
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    
    return {
      patternId,
      matchCount: edges.length,
      totalValue,
      avgValue,
      topMatches
    };
  });
};