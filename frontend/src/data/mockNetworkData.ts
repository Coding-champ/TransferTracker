// Temporary mock data for testing zoom functionality
export const MOCK_NETWORK_DATA = {
  nodes: [
    {
      id: '1',
      name: 'FC Bayern München',
      shortName: 'Bayern',
      league: 'Bundesliga',
      country: 'Germany',
      continent: 'Europe',
      x: 200,
      y: 200,
      stats: {
        transfersIn: 15,
        transfersOut: 12,
        totalSpent: 200000000,
        totalReceived: 150000000,
        netSpend: 50000000,
        successfulTransfersRate: 85,
        avgROI: 120
      }
    },
    {
      id: '2', 
      name: 'Manchester United',
      shortName: 'Man Utd',
      league: 'Premier League',
      country: 'England',
      continent: 'Europe',
      x: 400,
      y: 300,
      stats: {
        transfersIn: 18,
        transfersOut: 8,
        totalSpent: 300000000,
        totalReceived: 80000000,
        netSpend: 220000000,
        successfulTransfersRate: 75,
        avgROI: 95
      }
    },
    {
      id: '3',
      name: 'Real Madrid',
      shortName: 'Real',
      league: 'La Liga',
      country: 'Spain',
      continent: 'Europe',
      x: 300,
      y: 150,
      stats: {
        transfersIn: 12,
        transfersOut: 20,
        totalSpent: 250000000,
        totalReceived: 400000000,
        netSpend: -150000000,
        successfulTransfersRate: 90,
        avgROI: 150
      }
    },
    {
      id: '4',
      name: 'AC Milan',
      shortName: 'Milan',
      league: 'Serie A',
      country: 'Italy',
      continent: 'Europe',
      x: 500,
      y: 250,
      stats: {
        transfersIn: 10,
        transfersOut: 15,
        totalSpent: 120000000,
        totalReceived: 180000000,
        netSpend: -60000000,
        successfulTransfersRate: 70,
        avgROI: 80
      }
    },
    {
      id: '5',
      name: 'Paris Saint-Germain',
      shortName: 'PSG',
      league: 'Ligue 1',
      country: 'France',
      continent: 'Europe',
      x: 350,
      y: 400,
      stats: {
        transfersIn: 22,
        transfersOut: 5,
        totalSpent: 450000000,
        totalReceived: 50000000,
        netSpend: 400000000,
        successfulTransfersRate: 65,
        avgROI: 110
      }
    }
  ],
  edges: [
    {
      id: 'edge1',
      source: '1',
      target: '2',
      transfers: [
        { 
          id: 1,
          playerName: 'Player A',
          transferFee: 50000000,
          transferType: 'sale',
          date: '2023-07-15',
          season: '2023/24',
          position: 'Midfielder',
          direction: 'out' as const
        },
        { 
          id: 2,
          playerName: 'Player B',
          transferFee: 40000000,
          transferType: 'sale',
          date: '2023-08-20',
          season: '2023/24',
          position: 'Forward',
          direction: 'out' as const
        }
      ],
      stats: {
        totalValue: 90000000,
        transferCount: 2,
        avgTransferValue: 45000000,
        types: ['sale'],
        successRate: 80,
        seasons: ['2023/24'],
        transferWindows: ['summer']
      }
    },
    {
      id: 'edge2',
      source: '2',
      target: '3',
      transfers: [
        { 
          id: 3,
          playerName: 'Player C',
          transferFee: 100000000,
          transferType: 'sale',
          date: '2023-06-10',
          season: '2023/24',
          position: 'Forward',
          direction: 'out' as const
        }
      ],
      stats: {
        totalValue: 100000000,
        transferCount: 1,
        avgTransferValue: 100000000,
        types: ['sale'],
        successRate: 90,
        seasons: ['2023/24'],
        transferWindows: ['summer']
      }
    },
    {
      id: 'edge3',
      source: '3',
      target: '4',
      transfers: [
        { 
          id: 4,
          playerName: 'Player D',
          transferFee: 40000000,
          transferType: 'sale',
          date: '2024-01-15',
          season: '2023/24',
          position: 'Defender',
          direction: 'out' as const
        }
      ],
      stats: {
        totalValue: 40000000,
        transferCount: 1,
        avgTransferValue: 40000000,
        types: ['sale'],
        successRate: 75,
        seasons: ['2023/24'],
        transferWindows: ['winter']
      }
    },
    {
      id: 'edge4',
      source: '4',
      target: '5',
      transfers: [
        { 
          id: 5,
          playerName: 'Player E',
          transferFee: 30000000,
          transferType: 'sale',
          date: '2023-07-01',
          season: '2023/24',
          position: 'Midfielder',
          direction: 'out' as const
        }
      ],
      stats: {
        totalValue: 30000000,
        transferCount: 1,
        avgTransferValue: 30000000,
        types: ['sale'],
        successRate: 60,
        seasons: ['2023/24'],
        transferWindows: ['summer']
      }
    }
  ],
  metadata: {
    totalTransfers: 5,
    totalValue: 260000000,
    dateRange: {
      start: '2023-06-01',
      end: '2024-01-31'
    },
    clubCount: 5,
    edgeCount: 4,
    avgROI: 111,
    successRate: 76,
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
      leagueTiers: [],
      onlySuccessfulTransfers: false
    } as any
  }
};