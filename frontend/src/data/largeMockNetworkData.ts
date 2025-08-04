import { NetworkData } from '../types';

/**
 * Creates a large mock network dataset for testing performance optimizations
 */
export const createLargeMockNetwork = (nodeCount: number = 1000, edgeCount: number = 2000): NetworkData => {
  const nodes = [];
  const edges = [];

  // Famous leagues and countries for realistic data
  const leagues = [
    'Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1',
    'Eredivisie', 'Primeira Liga', 'Süper Lig', 'Pro League', 'Liga MX'
  ];
  
  const countries = [
    'England', 'Spain', 'Germany', 'Italy', 'France', 
    'Netherlands', 'Portugal', 'Turkey', 'Belgium', 'Mexico'
  ];

  // Generate nodes (clubs)
  for (let i = 0; i < nodeCount; i++) {
    const leagueIndex = i % leagues.length;
    const transfersIn = Math.floor(Math.random() * 50);
    const transfersOut = Math.floor(Math.random() * 50);
    const totalSpent = Math.floor(Math.random() * 500000000);
    const totalReceived = Math.floor(Math.random() * 400000000);
    
    nodes.push({
      id: `club-${i}`,
      name: `Football Club ${i}`,
      shortName: `FC${i}`,
      league: leagues[leagueIndex],
      country: countries[leagueIndex],
      continent: 'Europe',
      stats: {
        transfersIn,
        transfersOut,
        totalSpent,
        totalReceived,
        netSpend: totalSpent - totalReceived,
        avgROI: Math.floor(Math.random() * 200) - 50, // -50 to 150%
        successfulTransfersRate: Math.floor(Math.random() * 100)
      }
    });
  }

  // Generate edges (transfer relationships)
  const usedPairs = new Set<string>();
  
  for (let i = 0; i < edgeCount; i++) {
    let sourceIdx, targetIdx, pairKey;
    
    // Ensure unique pairs
    do {
      sourceIdx = Math.floor(Math.random() * nodeCount);
      targetIdx = Math.floor(Math.random() * nodeCount);
      pairKey = `${Math.min(sourceIdx, targetIdx)}-${Math.max(sourceIdx, targetIdx)}`;
    } while (sourceIdx === targetIdx || usedPairs.has(pairKey));
    
    usedPairs.add(pairKey);
    
    const transferCount = Math.floor(Math.random() * 5) + 1;
    const totalValue = Math.floor(Math.random() * 200000000);
    const transfers = [];
    
    // Generate individual transfers for this edge
    for (let j = 0; j < transferCount; j++) {
      transfers.push({
        id: i * 10 + j,
        playerName: `Player ${i}-${j}`,
        transferFee: Math.floor(totalValue / transferCount),
        transferType: Math.random() > 0.8 ? 'loan' : 'sale',
        date: `2023-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
        season: '2023/24',
        position: ['Forward', 'Midfielder', 'Defender', 'Goalkeeper'][Math.floor(Math.random() * 4)],
        direction: 'out' as const
      });
    }
    
    edges.push({
      id: `edge-${i}`,
      source: `club-${sourceIdx}`,
      target: `club-${targetIdx}`,
      transfers,
      stats: {
        totalValue,
        transferCount,
        avgTransferValue: totalValue / transferCount,
        types: ['sale', 'loan'],
        avgROI: Math.floor(Math.random() * 150),
        successRate: Math.floor(Math.random() * 100),
        seasons: ['2023/24'],
        transferWindows: ['summer', 'winter']
      }
    });
  }

  return {
    nodes,
    edges,
    metadata: {
      totalTransfers: edges.reduce((sum, e) => sum + e.stats.transferCount, 0),
      totalValue: edges.reduce((sum, e) => sum + e.stats.totalValue, 0),
      dateRange: {
        start: '2023-01-01',
        end: '2023-12-31'
      },
      clubCount: nodeCount,
      edgeCount: edges.length,
      avgROI: 112,
      successRate: 73,
      filters: {
        seasons: ['2023/24'],
        leagues: [],
        countries: [],
        continents: [],
        transferTypes: [],
        transferWindows: [],
        positions: [],
        nationalities: [],
        clubs: [],
        leagueTiers: [],
        onlySuccessfulTransfers: false
      } as any
    }
  };
};

/**
 * Large mock dataset with 1000 nodes and 2000 edges for performance testing
 */
export const LARGE_MOCK_NETWORK_DATA = createLargeMockNetwork(1000, 2000);

/**
 * Extra large mock dataset with 2000 nodes and 5000 edges for stress testing
 */
export const XLARGE_MOCK_NETWORK_DATA = createLargeMockNetwork(2000, 5000);

/**
 * Medium mock dataset with 500 nodes and 1000 edges
 */
export const MEDIUM_MOCK_NETWORK_DATA = createLargeMockNetwork(500, 1000);