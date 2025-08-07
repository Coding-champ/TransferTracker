import { NetworkData, FilterState } from '../../../../types';

// Minimal mock data for Sankey visualization testing
export const SANKEY_MOCK_DATA: NetworkData = {
  nodes: [
    {
      id: 'bayern',
      name: 'FC Bayern München',
      shortName: 'Bayern',
      league: 'Bundesliga',
      country: 'Germany',
      continent: 'Europe',
      leagueTier: 1,
      x: 200,
      y: 200,
      stats: {
        transfersIn: 8,
        transfersOut: 6,
        totalSpent: 150000000,
        totalReceived: 120000000,
        netSpend: 30000000,
        transferSuccessRate: 85,
        avgROI: 120
      }
    },
    {
      id: 'manutd',
      name: 'Manchester United',
      shortName: 'Man Utd',
      league: 'Premier League',
      country: 'England',
      continent: 'Europe',
      leagueTier: 1,
      x: 400,
      y: 300,
      stats: {
        transfersIn: 10,
        transfersOut: 4,
        totalSpent: 200000000,
        totalReceived: 60000000,
        netSpend: 140000000,
        transferSuccessRate: 75,
        avgROI: 95
      }
    },
    {
      id: 'realmadrid',
      name: 'Real Madrid',
      shortName: 'Real',
      league: 'La Liga',
      country: 'Spain',
      continent: 'Europe',
      leagueTier: 1,
      x: 300,
      y: 150,
      stats: {
        transfersIn: 12,
        transfersOut: 8,
        totalSpent: 250000000,
        totalReceived: 180000000,
        netSpend: 70000000,
        transferSuccessRate: 90,
        avgROI: 140
      }
    },
    {
      id: 'psg',
      name: 'Paris Saint-Germain',
      shortName: 'PSG',
      league: 'Ligue 1',
      country: 'France',
      continent: 'Europe',
      leagueTier: 1,
      x: 150,
      y: 400,
      stats: {
        transfersIn: 15,
        transfersOut: 5,
        totalSpent: 300000000,
        totalReceived: 80000000,
        netSpend: 220000000,
        transferSuccessRate: 70,
        avgROI: 85
      }
    },
    {
      id: 'juventus',
      name: 'Juventus',
      shortName: 'Juve',
      league: 'Serie A',
      country: 'Italy',
      continent: 'Europe',
      leagueTier: 1,
      x: 350,
      y: 250,
      stats: {
        transfersIn: 9,
        transfersOut: 7,
        totalSpent: 180000000,
        totalReceived: 140000000,
        netSpend: 40000000,
        transferSuccessRate: 80,
        avgROI: 110
      }
    }
  ],
  edges: [
    {
      id: 'transfer1',
      source: 'bayern',
      target: 'manutd',
      transfers: [],
      stats: {
        transferCount: 2,
        totalValue: 80000000,
        avgTransferValue: 40000000,
        types: ['sale'],
        avgROI: 110,
        transferSuccessRate: 50,
        seasons: ['2023/24'],
        transferWindows: ['summer']
      }
    },
    {
      id: 'transfer2',
      source: 'realmadrid',
      target: 'psg',
      transfers: [],
      stats: {
        transferCount: 3,
        totalValue: 120000000,
        avgTransferValue: 40000000,
        types: ['sale'],
        avgROI: 95,
        transferSuccessRate: 67,
        seasons: ['2023/24'],
        transferWindows: ['summer']
      }
    },
    {
      id: 'transfer3',
      source: 'manutd',
      target: 'juventus',
      transfers: [],
      stats: {
        transferCount: 1,
        totalValue: 50000000,
        avgTransferValue: 50000000,
        types: ['sale'],
        avgROI: 130,
        transferSuccessRate: 100,
        seasons: ['2023/24'],
        transferWindows: ['summer']
      }
    },
    {
      id: 'transfer4',
      source: 'psg',
      target: 'bayern',
      transfers: [],
      stats: {
        transferCount: 2,
        totalValue: 90000000,
        avgTransferValue: 45000000,
        types: ['sale'],
        avgROI: 85,
        transferSuccessRate: 50,
        seasons: ['2023/24'],
        transferWindows: ['summer']
      }
    },
    {
      id: 'transfer5',
      source: 'juventus',
      target: 'realmadrid',
      transfers: [],
      stats: {
        transferCount: 1,
        totalValue: 60000000,
        avgTransferValue: 60000000,
        types: ['sale'],
        avgROI: 125,
        transferSuccessRate: 100,
        seasons: ['2023/24'],
        transferWindows: ['summer']
      }
    },
    {
      id: 'transfer6',
      source: 'bayern',
      target: 'juventus',
      transfers: [],
      stats: {
        transferCount: 2,
        totalValue: 70000000,
        avgTransferValue: 35000000,
        types: ['sale'],
        avgROI: 140,
        transferSuccessRate: 100,
        seasons: ['2023/24'],
        transferWindows: ['summer']
      }
    }
  ],
  metadata: {
    totalTransfers: 11,
    totalValue: 470000000,
    dateRange: {
      start: '2023-07-01',
      end: '2024-06-30'
    },
    clubCount: 5,
    edgeCount: 6,
    avgROI: 115.8,
    transferSuccessRate: 80,
    filters: {
      seasons: ['2023/24'],
      leagues: [],
      countries: [],
      continents: [],
      transferTypes: ['sale'],
      transferWindows: [],
      positions: [],
      nationalities: [],
      clubs: [],
      leagueTiers: []
    } as FilterState
  }
};