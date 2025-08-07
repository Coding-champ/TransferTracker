import { NetworkData, FilterState, NetworkNode, NetworkEdge } from '../types/index';

// Create sample data for heatmap testing
export const createMockNetworkData = (): NetworkData => {
  // Sample nodes representing clubs
  const nodes: NetworkNode[] = [
    {
      id: 'bayern-munich',
      name: 'Bayern Munich',
      shortName: 'Bayern',
      league: 'Bundesliga',
      country: 'Germany',
      continent: 'Europe',
      stats: {
        transfersIn: 15,
        transfersOut: 12,
        totalSpent: 80000000,
        totalReceived: 60000000,
        netSpend: 20000000,
        transferSuccessRate: 0.75
      }
    },
    {
      id: 'real-madrid',
      name: 'Real Madrid',
      shortName: 'Real',
      league: 'La Liga',
      country: 'Spain', 
      continent: 'Europe',
      stats: {
        transfersIn: 18,
        transfersOut: 14,
        totalSpent: 120000000,
        totalReceived: 90000000,
        netSpend: 30000000,
        transferSuccessRate: 0.8
      }
    },
    {
      id: 'manchester-city',
      name: 'Manchester City',
      shortName: 'Man City',
      league: 'Premier League',
      country: 'England',
      continent: 'Europe',
      stats: {
        transfersIn: 20,
        transfersOut: 16,
        totalSpent: 150000000,
        totalReceived: 80000000,
        netSpend: 70000000,
        transferSuccessRate: 0.85
      }
    },
    {
      id: 'psg',
      name: 'Paris Saint-Germain',
      shortName: 'PSG',
      league: 'Ligue 1',
      country: 'France',
      continent: 'Europe',
      stats: {
        transfersIn: 12,
        transfersOut: 10,
        totalSpent: 200000000,
        totalReceived: 50000000,
        netSpend: 150000000,
        transferSuccessRate: 0.7
      }
    },
    {
      id: 'juventus',
      name: 'Juventus',
      shortName: 'Juve',
      league: 'Serie A',
      country: 'Italy',
      continent: 'Europe',
      stats: {
        transfersIn: 14,
        transfersOut: 18,
        totalSpent: 70000000,
        totalReceived: 100000000,
        netSpend: -30000000,
        transferSuccessRate: 0.65
      }
    }
  ];

  // Sample edges representing transfers between clubs
  const edges: NetworkEdge[] = [
    {
      id: 'edge-1',
      source: 'bayern-munich',
      target: 'real-madrid',
      transfers: [],
      stats: {
        totalValue: 45000000,
        transferCount: 3,
        avgTransferValue: 15000000,
        types: ['sale', 'loan'],
        avgROI: 1.2,
        transferSuccessRate: 0.8,
        seasons: ['2023/24', '2022/23'],
        transferWindows: ['summer', 'winter']
      }
    },
    {
      id: 'edge-2',
      source: 'manchester-city',
      target: 'psg',
      transfers: [],
      stats: {
        totalValue: 80000000,
        transferCount: 2,
        avgTransferValue: 40000000,
        types: ['sale'],
        avgROI: 0.9,
        transferSuccessRate: 0.9,
        seasons: ['2023/24'],
        transferWindows: ['summer']
      }
    },
    {
      id: 'edge-3',
      source: 'real-madrid',
      target: 'juventus',
      transfers: [],
      stats: {
        totalValue: 30000000,
        transferCount: 4,
        avgTransferValue: 7500000,
        types: ['sale', 'loan', 'free'],
        avgROI: 1.5,
        transferSuccessRate: 0.75,
        seasons: ['2023/24', '2022/23'],
        transferWindows: ['summer', 'winter']
      }
    },
    {
      id: 'edge-4',
      source: 'psg',
      target: 'bayern-munich',
      transfers: [],
      stats: {
        totalValue: 25000000,
        transferCount: 2,
        avgTransferValue: 12500000,
        types: ['sale'],
        avgROI: 1.1,
        transferSuccessRate: 0.6,
        seasons: ['2022/23'],
        transferWindows: ['winter']
      }
    },
    {
      id: 'edge-5',
      source: 'juventus',
      target: 'manchester-city',
      transfers: [],
      stats: {
        totalValue: 60000000,
        transferCount: 1,
        avgTransferValue: 60000000,
        types: ['sale'],
        avgROI: 0.8,
        transferSuccessRate: 1.0,
        seasons: ['2023/24'],
        transferWindows: ['summer']
      }
    }
  ];

  return {
    nodes,
    edges,
    metadata: {
      totalTransfers: edges.reduce((sum, edge) => sum + edge.stats.transferCount, 0),
      totalValue: edges.reduce((sum, edge) => sum + edge.stats.totalValue, 0),
      dateRange: {
        start: '2022-07-01',
        end: '2024-06-30'
      },
      clubCount: nodes.length,
      edgeCount: edges.length,
      avgROI: edges.reduce((sum, edge) => sum + (edge.stats.avgROI || 0), 0) / edges.length,
      transferSuccessRate: edges.reduce((sum, edge) => sum + (edge.stats.transferSuccessRate || 0), 0) / edges.length,
      filters: {
        seasons: ['2023/24'],
        leagues: [],
        countries: [],
        continents: [],
        transferTypes: ['sale', 'loan', 'free'],
        transferWindows: [],
        positions: [],
        nationalities: [],
        clubs: [],
        leagueTiers: []
      }
    }
  };
};

export const createMockFilters = (): FilterState => ({
  seasons: ['2023/24'],
  leagues: [],
  countries: [],
  continents: [],
  transferTypes: ['sale', 'loan', 'free'],
  transferWindows: [],
  positions: [],
  nationalities: [],
  clubs: [],
  leagueTiers: []
});