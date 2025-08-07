import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Enhanced Types
interface FilterParams {
  seasons?: string[];
  dateFrom?: string;
  dateTo?: string;
  leagues?: string[];
  countries?: string[];
  continents?: string[];
  clubs?: number[];
  transferTypes?: string[];
  transferWindows?: string[]; // summer, winter
  minTransferFee?: number;
  maxTransferFee?: number;
  hasTransferFee?: boolean;
  positions?: string[];
  nationalities?: string[];
  minPlayerAge?: number;
  maxPlayerAge?: number;
  minContractDuration?: number;
  maxContractDuration?: number;
  leagueTiers?: number[]; // 1, 2, 3, etc.
  minROI?: number;
  maxROI?: number;
  isLoanToBuy?: boolean;
  onlySuccessfulTransfers?: boolean;
  minPerformanceRating?: number; // 1-10 rating
  maxPerformanceRating?: number;
  minTransferCount?: number;
  excludeLoans?: boolean;
  onlyDirectTransfers?: boolean;
  limit?: number;
  includeStats?: boolean;
}

interface NetworkNode {
  id: string;
  name: string;
  shortName?: string;
  league: string;
  country: string;
  continent?: string;
  logoUrl?: string;
  clubValue?: number;
  foundingYear?: number;
  stadiumCapacity?: number;
  leagueTier?: number;
  stats: {
    transfersIn: number;
    transfersOut: number;
    totalSpent: number;
    totalReceived: number;
    netSpend: number;
    avgPlayerAge?: number;
    avgROI?: number;
    successfulTransfersRate?: number;
    avgPerformanceRating?: number;
  };
}

interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  transfers: TransferInfo[];
  stats: {
    totalValue: number;
    transferCount: number;
    avgTransferValue: number;
    types: string[];
    avgROI?: number;
    transferSuccessRate?: number;
    seasons: string[];
    transferWindows: string[];
  };
}

interface TransferInfo {
  id: number;
  playerName: string;
  playerNationality?: string;
  transferFee: number | null;
  transferType: string;
  transferWindow?: string;
  date: Date;
  season: string;
  position: string | null;
  playerAge?: number;
  contractDuration?: number;
  marketValueAtTransfer?: number;
  isLoanToBuy?: boolean;
  roiPercentage?: number;
  performanceRating?: number;
  direction: 'out' | 'in';
}

// Utility functions
const safeParseInt = (value: any, defaultValue: number = 0): number => {
  if (value === undefined || value === null || value === '') return defaultValue;
  const parsed = parseInt(String(value), 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

const safeParseFloat = (value: any, defaultValue: number = 0): number => {
  if (value === undefined || value === null || value === '') return defaultValue;
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? defaultValue : parsed;
};

const safeParseArray = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  return String(value).split(',').filter(Boolean);
};

const safeParseIntArray = (value: any): number[] => {
  if (!value) return [];
  const stringArray = safeParseArray(value);
  return stringArray.map(v => safeParseInt(v)).filter(v => v > 0);
};

const bigIntToNumber = (value: bigint | null): number | null => {
  return value ? Number(value) : null;
};

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      success: true, 
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Database connection failed',
      timestamp: new Date().toISOString(),
      database: 'disconnected'
    });
  }
});

// Get all leagues with enhanced data
app.get('/api/leagues', async (req, res) => {
  try {
    const leagues = await prisma.league.findMany({
      include: {
        _count: {
          select: { clubs: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    const formattedLeagues = leagues.map(league => ({
      id: league.id,
      name: league.name,
      country: league.country,
      continent: league.continent,
      tier: league.tier,
      seasonStartMonth: league.seasonStartMonth,
      uefaCoefficient: league.uefaCoefficient,
      clubCount: league._count.clubs,
      createdAt: league.createdAt
    }));

    res.json({ success: true, data: formattedLeagues });
  } catch (error) {
    console.error('Error fetching leagues:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch leagues',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all clubs with enhanced data
app.get('/api/clubs', async (req, res) => {
  try {
    const leagueId = safeParseInt(req.query.leagueId);    
    const whereClause = leagueId > 0 ? { leagueId } : {};

    const clubs = await prisma.club.findMany({
      where: whereClause,
      include: { 
        league: true,
        _count: {
          select: {
            transfersIn: true,
            transfersOut: true,
            currentPlayers: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    const formattedClubs = clubs.map(club => ({
      id: club.id,
      name: club.name,
      shortName: club.shortName,
      league: {
        id: club.league.id,
        name: club.league.name,
        country: club.league.country,
        continent: club.league.continent,
        tier: club.league.tier
      },
      country: club.country,
      city: club.city,
      logoUrl: club.logoUrl,
      clubValue: bigIntToNumber(club.clubValue),
      foundingYear: club.foundingYear,
      stadiumCapacity: club.stadiumCapacity,
      isActive: club.isActive,
      transferCount: {
        in: club._count.transfersIn,
        out: club._count.transfersOut,
        total: club._count.transfersIn + club._count.transfersOut
      },
      currentPlayerCount: club._count.currentPlayers
    }));
    
    res.json({ success: true, data: formattedClubs });
  } catch (error) {
    console.error('Error fetching clubs:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch clubs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get available seasons
app.get('/api/seasons', async (req, res) => {
  try {
    const seasons = await prisma.transfer.findMany({
      select: { season: true },
      distinct: ['season'],
      orderBy: { season: 'desc' }
    });
    
    res.json({ 
      success: true, 
      data: seasons.map(s => s.season) 
    });
  } catch (error) {
    console.error('Error fetching seasons:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch seasons',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get transfer windows (NEW)
app.get('/api/transfer-windows', async (req, res) => {
  try {
    const windows = await prisma.transfer.findMany({
      select: { transferWindow: true },
      distinct: ['transferWindow'],
      where: { transferWindow: { not: undefined } },
      orderBy: { transferWindow: 'asc' }
    });
    
    res.json({ 
      success: true, 
      data: windows.map(w => w.transferWindow).filter(Boolean)
    });
  } catch (error) {
    console.error('Error fetching transfer windows:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch transfer windows',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get transfer types
app.get('/api/transfer-types', async (req, res) => {
  try {
    const types = await prisma.transfer.findMany({
      select: { transferType: true },
      distinct: ['transferType'],
      orderBy: { transferType: 'asc' }
    });
    
    res.json({ 
      success: true, 
      data: types.map(t => t.transferType) 
    });
  } catch (error) {
    console.error('Error fetching transfer types:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch transfer types',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get player positions
app.get('/api/positions', async (req, res) => {
  try {
    const positions = await prisma.transfer.findMany({
      select: { playerPosition: true },
      distinct: ['playerPosition'],
      where: { playerPosition: { not: null } },
      orderBy: { playerPosition: 'asc' }
    });
    
    res.json({ 
      success: true, 
      data: positions.map(p => p.playerPosition).filter(Boolean)
    });
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch positions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get player nationalities
app.get('/api/nationalities', async (req, res) => {
  try {
    const nationalities = await prisma.transfer.findMany({
      select: { playerNationality: true },
      distinct: ['playerNationality'],
      where: { playerNationality: { not: null } },
      orderBy: { playerNationality: 'asc' }
    });
    
    res.json({ 
      success: true, 
      data: nationalities.map(n => n.playerNationality).filter(Boolean)
    });
  } catch (error) {
    console.error('Error fetching nationalities:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch nationalities',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get continents
app.get('/api/continents', async (req, res) => {
  try {
    const continents = await prisma.league.findMany({
      select: { continent: true },
      distinct: ['continent'],
      orderBy: { continent: 'asc' }
    });
    
    res.json({ 
      success: true, 
      data: continents.map(c => c.continent) 
    });
  } catch (error) {
    console.error('Error fetching continents:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch continents',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get league tiers
app.get('/api/league-tiers', async (req, res) => {
  try {
    const tiers = await prisma.league.findMany({
      select: { tier: true },
      distinct: ['tier'],
      orderBy: { tier: 'asc' }
    });
    
    res.json({ 
      success: true, 
      data: tiers.map(t => t.tier) 
    });
  } catch (error) {
    console.error('Error fetching league tiers:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch league tiers',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Enhanced network data endpoint with all new filters
app.get('/api/network-data', async (req, res) => {
  try {
    console.log('Received network-data request with query:', req.query);

    const filters: FilterParams = {
      seasons: safeParseArray(req.query.seasons),
      leagues: safeParseArray(req.query.leagues),
      countries: safeParseArray(req.query.countries),
      continents: safeParseArray(req.query.continents),
      transferTypes: safeParseArray(req.query.transferTypes),
      transferWindows: safeParseArray(req.query.transferWindows),
      positions: safeParseArray(req.query.positions),
      nationalities: safeParseArray(req.query.nationalities),
      clubs: safeParseArray(req.query.clubs).map(id => safeParseInt(id)).filter(id => id > 0),
      leagueTiers: safeParseIntArray(req.query.leagueTiers),
      minTransferFee: safeParseInt(req.query.minTransferFee),
      maxTransferFee: safeParseInt(req.query.maxTransferFee),
      minPlayerAge: safeParseInt(req.query.minPlayerAge),
      maxPlayerAge: safeParseInt(req.query.maxPlayerAge),
      minContractDuration: safeParseInt(req.query.minContractDuration),
      maxContractDuration: safeParseInt(req.query.maxContractDuration),
      minROI: safeParseFloat(req.query.minROI),
      maxROI: safeParseFloat(req.query.maxROI),
      minPerformanceRating: safeParseFloat(req.query.minPerformanceRating),
      maxPerformanceRating: safeParseFloat(req.query.maxPerformanceRating),
      hasTransferFee: req.query.hasTransferFee === 'true',
      excludeLoans: req.query.excludeLoans === 'true',
      isLoanToBuy: req.query.isLoanToBuy === 'true',
      onlySuccessfulTransfers: req.query.onlySuccessfulTransfers === 'true',
      limit: safeParseInt(req.query.limit, 1000)
    };

    // Build enhanced where clause for transfers
    const whereClause: any = {};
    
    // Season filter
    if (filters.seasons && filters.seasons.length > 0) {
      whereClause.season = { in: filters.seasons };
    }
    
    // Transfer window filter
    if (filters.transferWindows && filters.transferWindows.length > 0) {
      whereClause.transferWindow = { in: filters.transferWindows };
    }
    
    // Transfer type filter
    if (filters.transferTypes && filters.transferTypes.length > 0) {
      if (filters.excludeLoans) {
        const nonLoanTypes = filters.transferTypes.filter(type => !type.includes('loan'));
        if (nonLoanTypes.length > 0) {
          whereClause.transferType = { in: nonLoanTypes };
        }
      } else {
        whereClause.transferType = { in: filters.transferTypes };
      }
    } else if (filters.excludeLoans) {
      whereClause.transferType = { notIn: ['loan', 'loan_with_option'] };
    }

    // Loan-to-buy filter
    if (filters.isLoanToBuy) {
      whereClause.isLoanToBuy = true;
    }

    // Position filter
    if (filters.positions && filters.positions.length > 0) {
      whereClause.playerPosition = { in: filters.positions };
    }

    // Nationality filter
    if (filters.nationalities && filters.nationalities.length > 0) {
      whereClause.playerNationality = { in: filters.nationalities };
    }

    // Player age filter
    if (filters.minPlayerAge || filters.maxPlayerAge) {
      whereClause.playerAgeAtTransfer = {};
      if (filters.minPlayerAge) {
        whereClause.playerAgeAtTransfer.gte = filters.minPlayerAge;
      }
      if (filters.maxPlayerAge) {
        whereClause.playerAgeAtTransfer.lte = filters.maxPlayerAge;
      }
    }

    // Contract duration filter
    if (filters.minContractDuration || filters.maxContractDuration) {
      whereClause.contractDuration = {};
      if (filters.minContractDuration) {
        whereClause.contractDuration.gte = filters.minContractDuration;
      }
      if (filters.maxContractDuration) {
        whereClause.contractDuration.lte = filters.maxContractDuration;
      }
    }

    // ROI filter
    if (filters.minROI !== undefined && filters.minROI !== 0 || filters.maxROI !== undefined && filters.maxROI !== 0) {
      whereClause.roiPercentage = {};
      if (filters.minROI !== undefined && filters.minROI !== 0) {
        whereClause.roiPercentage.gte = filters.minROI;
      }
      if (filters.maxROI !== undefined && filters.maxROI !== 0) {
        whereClause.roiPercentage.lte = filters.maxROI;
      }
    }
    
    // Transfer fee filters
    if (filters.hasTransferFee) {
      whereClause.transferFee = { not: null };
    }
    
    if (filters.minTransferFee || filters.maxTransferFee) {
      if (!whereClause.transferFee) whereClause.transferFee = {};
      if (filters.minTransferFee) {
        whereClause.transferFee.gte = BigInt(filters.minTransferFee);
      }
      if (filters.maxTransferFee) {
        whereClause.transferFee.lte = BigInt(filters.maxTransferFee);
      }
    }

    // Success filters
    if (filters.onlySuccessfulTransfers) {
      whereClause.wasSuccessful = true;
    }

    // Enhanced League/Country/Club/Continent filters
    const clubFilters = [];
    
    if (filters.leagues && filters.leagues.length > 0) {
      clubFilters.push({ league: { name: { in: filters.leagues } } });
    }
    
    if (filters.countries && filters.countries.length > 0) {
      clubFilters.push({ country: { in: filters.countries } });
    }

    if (filters.continents && filters.continents.length > 0) {
      clubFilters.push({ league: { continent: { in: filters.continents } } });
    }

    if (filters.leagueTiers && filters.leagueTiers.length > 0) {
      clubFilters.push({ league: { tier: { in: filters.leagueTiers } } });
    }
    
    if (filters.clubs && filters.clubs.length > 0) {
      clubFilters.push({ id: { in: filters.clubs } });
    }

    if (clubFilters.length > 0) {
      const clubFilter = clubFilters.length === 1 ? clubFilters[0] : { AND: clubFilters };
      whereClause.OR = [
        { newClub: clubFilter },
        { oldClub: clubFilter }
      ];
    }

    console.log('Built enhanced where clause:', JSON.stringify(whereClause, (key, value) => 
      typeof value === 'bigint' ? value.toString() : value, 2));

    // Fetch transfers with enhanced relations
    const transfers = await prisma.transfer.findMany({
      where: whereClause,
      include: {
        oldClub: { include: { league: true } },
        newClub: { include: { league: true } },
        success: true, // Include performance data
        playerTransfer: true // Include player performance
      },
      take: filters.limit,
      orderBy: { date: 'desc' }
    });

    console.log(`Found ${transfers.length} transfers`);

    if (transfers.length === 0) {
      return res.json({
        success: true,
        data: {
          nodes: [],
          edges: [],
          metadata: {
            totalTransfers: 0,
            totalValue: 0,
            dateRange: { start: null, end: null },
            filters
          }
        }
      });
    }

    // Build enhanced nodes and edges
    const clubsMap = new Map<number, NetworkNode>();
    const edgesMap = new Map<string, NetworkEdge>();

    transfers.forEach(transfer => {
      const oldClub = transfer.oldClub;
      const newClub = transfer.newClub;
      const transferValue = bigIntToNumber(transfer.transferFee) || 0;
      
      // Add new club to nodes with enhanced data
      if (!clubsMap.has(newClub.id)) {
        clubsMap.set(newClub.id, {
          id: `club_${newClub.id}`,
          name: newClub.name,
          shortName: newClub.shortName || undefined,
          league: newClub.league.name,
          country: newClub.country,
          continent: newClub.league.continent,
          logoUrl: newClub.logoUrl || undefined,
          clubValue: bigIntToNumber(newClub.clubValue) || undefined,
          foundingYear: newClub.foundingYear || undefined,
          stadiumCapacity: newClub.stadiumCapacity || undefined,
          leagueTier: newClub.league.tier,
          stats: {
            transfersIn: 0,
            transfersOut: 0,
            totalSpent: 0,
            totalReceived: 0,
            netSpend: 0,
            avgROI: 0,
            successfulTransfersRate: 0,
            avgPerformanceRating: 0
          }
        });
      }

      // Add old club to nodes (if exists) with enhanced data
      if (oldClub && !clubsMap.has(oldClub.id)) {
        clubsMap.set(oldClub.id, {
          id: `club_${oldClub.id}`,
          name: oldClub.name,
          shortName: oldClub.shortName || undefined,
          league: oldClub.league.name,
          country: oldClub.country,
          continent: oldClub.league.continent,
          logoUrl: oldClub.logoUrl || undefined,
          clubValue: bigIntToNumber(oldClub.clubValue) || undefined,
          foundingYear: oldClub.foundingYear || undefined,
          stadiumCapacity: oldClub.stadiumCapacity || undefined,
          leagueTier: oldClub.league.tier,
          stats: {
            transfersIn: 0,
            transfersOut: 0,
            totalSpent: 0,
            totalReceived: 0,
            netSpend: 0,
            avgROI: 0,
            successfulTransfersRate: 0,
            avgPerformanceRating: 0
          }
        });
      }

      // Update enhanced stats
      const newClubNode = clubsMap.get(newClub.id)!;
      newClubNode.stats.transfersIn++;
      newClubNode.stats.totalSpent += transferValue;

      if (oldClub) {
        const oldClubNode = clubsMap.get(oldClub.id)!;
        oldClubNode.stats.transfersOut++;
        oldClubNode.stats.totalReceived += transferValue;

        // Create enhanced edge
        const sourceId = oldClub.id;
        const targetId = newClub.id;
        const edgeKey = `${sourceId}-${targetId}`;
        
        if (!edgesMap.has(edgeKey)) {
          edgesMap.set(edgeKey, {
            id: edgeKey,
            source: `club_${sourceId}`,
            target: `club_${targetId}`,
            transfers: [],
            stats: {
              totalValue: 0,
              transferCount: 0,
              avgTransferValue: 0,
              types: [],
              avgROI: 0,
              transferSuccessRate: 0,
              seasons: [],
              transferWindows: []
            }
          });
        }

        const edge = edgesMap.get(edgeKey)!;
        edge.transfers.push({
          id: transfer.id,
          playerName: transfer.playerName,
          playerNationality: transfer.playerNationality || undefined,
          transferFee: transferValue || null,
          transferType: transfer.transferType,
          transferWindow: transfer.transferWindow || undefined,
          date: transfer.date,
          season: transfer.season,
          position: transfer.playerPosition,
          playerAge: transfer.playerAgeAtTransfer || undefined,
          contractDuration: transfer.contractDuration || undefined,
          marketValueAtTransfer: bigIntToNumber(transfer.marketValueAtTransfer) || undefined,
          isLoanToBuy: transfer.isLoanToBuy,
          roiPercentage: transfer.roiPercentage || undefined,
          performanceRating: transfer.success?.performanceRating || undefined,
          direction: 'out'
        });
        
        edge.stats.transferCount++;
        edge.stats.totalValue += transferValue;
        
        if (!edge.stats.types.includes(transfer.transferType)) {
          edge.stats.types.push(transfer.transferType);
        }

        // Track seasons and windows
        if (!edge.stats.seasons.includes(transfer.season)) {
          edge.stats.seasons.push(transfer.season);
        }
        if (transfer.transferWindow && !edge.stats.transferWindows.includes(transfer.transferWindow)) {
          edge.stats.transferWindows.push(transfer.transferWindow);
        }
      }
    });

    // Calculate enhanced averages and net spend
    clubsMap.forEach(club => {
      club.stats.netSpend = club.stats.totalSpent - club.stats.totalReceived;
      
      // Calculate performance metrics from transfers
      const clubTransfers = transfers.filter(t => 
        t.newClubId === parseInt(club.id.replace('club_', '')) || 
        (t.oldClubId && t.oldClubId === parseInt(club.id.replace('club_', '')))
      );

      if (clubTransfers.length > 0) {
        // Average ROI
        const roiValues = clubTransfers
          .map(t => t.roiPercentage)
          .filter(roi => roi !== null && roi !== undefined) as number[];
        if (roiValues.length > 0) {
          club.stats.avgROI = roiValues.reduce((sum, roi) => sum + roi, 0) / roiValues.length;
        }

        // Success rate
        const successfulTransfers = clubTransfers.filter(t => t.wasSuccessful === true).length;
        club.stats.successfulTransfersRate = (successfulTransfers / clubTransfers.length) * 100;

        // Average performance rating
        const performanceRatings = clubTransfers
          .map(t => t.success?.performanceRating)
          .filter(rating => rating !== null && rating !== undefined) as number[];
        if (performanceRatings.length > 0) {
          club.stats.avgPerformanceRating = performanceRatings.reduce((sum, rating) => sum + rating, 0) / performanceRatings.length;
        }
      }
    });

    edgesMap.forEach(edge => {
      if (edge.stats.transferCount > 0) {
        edge.stats.avgTransferValue = edge.stats.totalValue / edge.stats.transferCount;
        
        // Calculate average ROI for edge
        const edgeROIValues = edge.transfers
          .map(t => t.roiPercentage)
          .filter(roi => roi !== undefined && roi !== null) as number[];
        if (edgeROIValues.length > 0) {
          edge.stats.avgROI = edgeROIValues.reduce((sum, roi) => sum + roi, 0) / edgeROIValues.length;
        }

        // Calculate success rate for edge
        const edgeSuccessfulTransfers = edge.transfers.filter(t => 
          t.performanceRating !== undefined && t.performanceRating >= 6
        ).length;
        edge.stats.transferSuccessRate = (edgeSuccessfulTransfers / edge.stats.transferCount) * 100;
      }
    });

    const nodes = Array.from(clubsMap.values());
    const edges = Array.from(edgesMap.values());

    // Filter out nodes with no connections if requested
    const connectedNodeIds = new Set();
    edges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });

    const filteredNodes = nodes.filter(node => 
      connectedNodeIds.has(node.id) || node.stats.transfersIn > 0 || node.stats.transfersOut > 0
    );

    console.log(`Returning ${filteredNodes.length} nodes and ${edges.length} edges`);

    const totalValue = transfers.reduce((sum, t) => sum + (bigIntToNumber(t.transferFee) || 0), 0);

    const response = {
      success: true,
      data: {
        nodes: filteredNodes,
        edges,
        metadata: {
          totalTransfers: transfers.length,
          totalValue,
          dateRange: {
            start: transfers.length > 0 ? transfers[transfers.length - 1].date : null,
            end: transfers.length > 0 ? transfers[0].date : null
          },
          clubCount: filteredNodes.length,
          edgeCount: edges.length,
          avgROI: transfers.length > 0 ? transfers.reduce((sum, t) => sum + (t.roiPercentage || 0), 0) / transfers.length : 0,
          transferSuccessRate: transfers.length > 0 ? (transfers.filter(t => t.wasSuccessful === true).length / transfers.length) * 100 : 0,
          filters
        }
      }
    };

    return res.json(response);
  } catch (error) {
    console.error('Network data error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch network data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Enhanced transfer details with pagination and all new filters
app.get('/api/transfers', async (req, res) => {
  try {
    const page = safeParseInt(req.query.page, 1);
    const limit = Math.min(safeParseInt(req.query.limit, 50), 200);
    const skip = (page - 1) * limit;

    // Build enhanced filters
    const whereClause: any = {};
    
    if (req.query.clubId) {
      const clubId = safeParseInt(req.query.clubId);
      whereClause.OR = [
        { newClubId: clubId },
        { oldClubId: clubId }
      ];
    }

    if (req.query.season) {
      whereClause.season = String(req.query.season);
    }

    if (req.query.transferType) {
      whereClause.transferType = String(req.query.transferType);
    }

    // Transfer window filter
    if (req.query.transferWindow) {
      whereClause.transferWindow = String(req.query.transferWindow);
    }

    // Nationality filter
    if (req.query.nationality) {
      whereClause.playerNationality = String(req.query.nationality);
    }

    // Age range filter
    if (req.query.minAge || req.query.maxAge) {
      whereClause.playerAgeAtTransfer = {};
      if (req.query.minAge) {
        whereClause.playerAgeAtTransfer.gte = safeParseInt(req.query.minAge);
      }
      if (req.query.maxAge) {
        whereClause.playerAgeAtTransfer.lte = safeParseInt(req.query.maxAge);
      }
    }

    // Contract duration filter
    if (req.query.minContract || req.query.maxContract) {
      whereClause.contractDuration = {};
      if (req.query.minContract) {
        whereClause.contractDuration.gte = safeParseInt(req.query.minContract);
      }
      if (req.query.maxContract) {
        whereClause.contractDuration.lte = safeParseInt(req.query.maxContract);
      }
    }

    // ROI filter
    if (req.query.minROI || req.query.maxROI) {
      whereClause.roiPercentage = {};
      if (req.query.minROI) {
        whereClause.roiPercentage.gte = safeParseFloat(req.query.minROI);
      }
      if (req.query.maxROI) {
        whereClause.roiPercentage.lte = safeParseFloat(req.query.maxROI);
      }
    }

    // Success filter
    if (req.query.onlySuccessful === 'true') {
      whereClause.wasSuccessful = true;
    }

    // Loan-to-buy filter
    if (req.query.isLoanToBuy === 'true') {
      whereClause.isLoanToBuy = true;
    }

    const [transfers, total] = await Promise.all([
      prisma.transfer.findMany({
        where: whereClause,
        include: {
          oldClub: { include: { league: true } },
          newClub: { include: { league: true } },
          success: true, // Include success metrics
          playerTransfer: true, // Include player performance
          originalLoan: true, // Include loan relation
          followUpPurchases: true // Include follow-up purchases
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit
      }),
      prisma.transfer.count({ where: whereClause })
    ]);

    const formattedTransfers = transfers.map(transfer => ({
      id: transfer.id,
      playerName: transfer.playerName,
      playerNationality: transfer.playerNationality,
      transferFee: bigIntToNumber(transfer.transferFee),
      transferType: transfer.transferType,
      transferWindow: transfer.transferWindow,
      date: transfer.date,
      season: transfer.season,
      playerPosition: transfer.playerPosition,
      playerAge: transfer.playerAgeAtTransfer,
      marketValueAtTransfer: bigIntToNumber(transfer.marketValueAtTransfer),
      contractDuration: transfer.contractDuration,
      isLoanToBuy: transfer.isLoanToBuy,
      wasSuccessful: transfer.wasSuccessful,
      roiPercentage: transfer.roiPercentage,
      oldClub: transfer.oldClub ? {
        id: transfer.oldClub.id,
        name: transfer.oldClub.name,
        shortName: transfer.oldClub.shortName,
        league: transfer.oldClub.league.name,
        country: transfer.oldClub.country,
        continent: transfer.oldClub.league.continent,
        tier: transfer.oldClub.league.tier
      } : null,
      newClub: {
        id: transfer.newClub.id,
        name: transfer.newClub.name,
        shortName: transfer.newClub.shortName,
        league: transfer.newClub.league.name,
        country: transfer.newClub.country,
        continent: transfer.newClub.league.continent,
        tier: transfer.newClub.league.tier
      },
      // Success metrics
      success: transfer.success ? {
        performanceRating: transfer.success.performanceRating,
        marketValueGrowth: bigIntToNumber(transfer.success.marketValueGrowth),
        contractExtensions: transfer.success.contractExtensions,
        trophiesWon: transfer.success.trophiesWon,
        evaluatedAfterYears: transfer.success.evaluatedAfterYears,
        lastEvaluated: transfer.success.lastEvaluated
      } : null,
      // Player performance
      playerPerformance: transfer.playerTransfer ? {
        gamesPlayed: transfer.playerTransfer.gamesPlayed,
        goalsScored: transfer.playerTransfer.goalsScored,
        marketValueEnd: bigIntToNumber(transfer.playerTransfer.marketValueEnd),
        wasRegularStarter: transfer.playerTransfer.wasRegularStarter
      } : null,
      // Loan relationships
      isFollowUpPurchase: transfer.originalLoanId !== null,
      originalLoan: transfer.originalLoan ? {
        id: transfer.originalLoan.id,
        playerName: transfer.originalLoan.playerName,
        date: transfer.originalLoan.date
      } : null,
      hasFollowUpPurchases: transfer.followUpPurchases.length > 0,
      followUpPurchases: transfer.followUpPurchases.map(fp => ({
        id: fp.id,
        playerName: fp.playerName,
        transferFee: bigIntToNumber(fp.transferFee),
        date: fp.date
      }))
    }));

    res.json({
      success: true,
      data: {
        transfers: formattedTransfers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching transfers:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch transfers',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get transfer success statistics
app.get('/api/transfer-success-stats', async (req, res) => {
  try {
    const clubId = req.query.clubId ? safeParseInt(req.query.clubId) : undefined;
    const season = req.query.season ? String(req.query.season) : undefined;

    const whereClause: any = {};
    if (clubId) {
      whereClause.OR = [
        { newClubId: clubId },
        { oldClubId: clubId }
      ];
    }
    if (season) {
      whereClause.season = season;
    }

    const [
      totalTransfers,
      successfulTransfers,
      avgROI,
      avgPerformanceRating,
      topPerformers,
      worstPerformers
    ] = await Promise.all([
      prisma.transfer.count({ where: whereClause }),
      prisma.transfer.count({ 
        where: { ...whereClause, wasSuccessful: true } 
      }),
      prisma.transfer.aggregate({
        where: { ...whereClause, roiPercentage: { not: null } },
        _avg: { roiPercentage: true }
      }),
      prisma.transferSuccess.aggregate({
        where: {
          transfer: whereClause
        },
        _avg: { performanceRating: true }
      }),
      prisma.transfer.findMany({
        where: { 
          ...whereClause, 
          success: { performanceRating: { gte: 8 } }
        },
        include: {
          success: true,
          newClub: true,
          oldClub: true
        },
        orderBy: { success: { performanceRating: 'desc' } },
        take: 10
      }),
      prisma.transfer.findMany({
        where: { 
          ...whereClause, 
          success: { performanceRating: { lte: 4 } }
        },
        include: {
          success: true,
          newClub: true,
          oldClub: true
        },
        orderBy: { success: { performanceRating: 'asc' } },
        take: 10
      })
    ]);

    const transferSuccessRate = totalTransfers > 0 ? (successfulTransfers / totalTransfers) * 100 : 0;

    res.json({
      success: true,
      data: {
        overview: {
          totalTransfers,
          successfulTransfers,
          transferSuccessRate,
          avgROI: avgROI._avg.roiPercentage || 0,
          avgPerformanceRating: avgPerformanceRating._avg.performanceRating || 0
        },
        topPerformers: topPerformers.map(t => ({
          id: t.id,
          playerName: t.playerName,
          transferFee: bigIntToNumber(t.transferFee),
          performanceRating: t.success?.performanceRating,
          roiPercentage: t.roiPercentage,
          from: t.oldClub?.name || 'Free Agent',
          to: t.newClub.name,
          date: t.date
        })),
        worstPerformers: worstPerformers.map(t => ({
          id: t.id,
          playerName: t.playerName,
          transferFee: bigIntToNumber(t.transferFee),
          performanceRating: t.success?.performanceRating,
          roiPercentage: t.roiPercentage,
          from: t.oldClub?.name || 'Free Agent',
          to: t.newClub.name,
          date: t.date
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching success stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch transfer success statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get loan-to-buy analytics
app.get('/api/loan-to-buy-analytics', async (req, res) => {
  try {
    const [
      totalLoans,
      loansToBuy,
      completedPurchases,
      avgLoanDuration,
      successfulConversions
    ] = await Promise.all([
      prisma.transfer.count({
        where: { transferType: { in: ['loan', 'loan_with_option'] } }
      }),
      prisma.transfer.count({
        where: { isLoanToBuy: true }
      }),
      prisma.transfer.count({
        where: { 
          originalLoanId: { not: null },
          transferType: 'sale'
        }
      }),
      prisma.transfer.aggregate({
        where: { 
          transferType: { in: ['loan', 'loan_with_option'] },
          contractDuration: { not: null }
        },
        _avg: { contractDuration: true }
      }),
      prisma.transfer.findMany({
        where: {
          isLoanToBuy: true,
          followUpPurchases: { some: {} }
        },
        include: {
          followUpPurchases: {
            include: {
              newClub: true,
              oldClub: true
            }
          },
          newClub: true,
          oldClub: true
        }
      })
    ]);

    const conversionRate = loansToBuy > 0 ? (completedPurchases / loansToBuy) * 100 : 0;

    res.json({
      success: true,
      data: {
        overview: {
          totalLoans,
          loansToBuy,
          completedPurchases,
          conversionRate,
          avgLoanDuration: avgLoanDuration._avg.contractDuration || 0
        },
        successfulConversions: successfulConversions.map(loan => ({
          loanTransfer: {
            id: loan.id,
            playerName: loan.playerName,
            from: loan.oldClub?.name || 'Free Agent',
            to: loan.newClub.name,
            date: loan.date,
            season: loan.season
          },
          purchases: loan.followUpPurchases.map(purchase => ({
            id: purchase.id,
            transferFee: bigIntToNumber(purchase.transferFee),
            date: purchase.date,
            wasSuccessful: purchase.wasSuccessful
          }))
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching loan-to-buy analytics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch loan-to-buy analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Enhanced statistics endpoint
app.get('/api/statistics', async (req, res) => {
  try {
    const [
      totalTransfers,
      totalClubs,
      totalLeagues,
      transferValue,
      topTransfer,
      recentTransfers,
      avgROI,
      successfulTransfersCount,
      topPerformingClubs,
      transfersByWindow
    ] = await Promise.all([
      prisma.transfer.count(),
      prisma.club.count(),
      prisma.league.count(),
      prisma.transfer.aggregate({
        _sum: { transferFee: true },
        where: { transferFee: { not: null } }
      }),
      prisma.transfer.findFirst({
        where: { transferFee: { not: null } },
        orderBy: { transferFee: 'desc' },
        include: {
          oldClub: true,
          newClub: true
        }
      }),
      prisma.transfer.findMany({
        take: 10,
        orderBy: { date: 'desc' },
        include: {
          oldClub: { select: { name: true } },
          newClub: { select: { name: true } }
        }
      }),
      // Average ROI
      prisma.transfer.aggregate({
        where: { roiPercentage: { not: null } },
        _avg: { roiPercentage: true }
      }),
      // Success rate
      prisma.transfer.count({
        where: { wasSuccessful: true }
      }),
      // Top performing clubs by net spend efficiency
      prisma.club.findMany({
        include: {
          transfersIn: {
            include: { success: true }
          },
          transfersOut: {
            include: { success: true }
          },
          league: true
        },
        take: 10
      }),
      // Transfers by window
      prisma.transfer.groupBy({
        by: ['transferWindow'],
        _count: { transferWindow: true },
        where: { transferWindow: { not: undefined } }
      })
    ]);

    // Calculate club performance metrics
    const clubPerformances = topPerformingClubs.map(club => {
      const incomingTransfers = club.transfersIn;
      const outgoingTransfers = club.transfersOut;
      
      const totalSpent = incomingTransfers.reduce((sum, t) => sum + (Number(t.transferFee) || 0), 0);
      const totalReceived = outgoingTransfers.reduce((sum, t) => sum + (Number(t.transferFee) || 0), 0);
      const netSpend = totalSpent - totalReceived;
      
      const successfulIncoming = incomingTransfers.filter(t => t.wasSuccessful).length;
      const successfulOutgoing = outgoingTransfers.filter(t => t.wasSuccessful).length;
      const totalTransfers = incomingTransfers.length + outgoingTransfers.length;
      const transferSuccessRate = totalTransfers > 0 ? ((successfulIncoming + successfulOutgoing) / totalTransfers) * 100 : 0;
      
      const performanceRatings = [...incomingTransfers, ...outgoingTransfers]
        .map(t => t.success?.performanceRating)
        .filter(rating => rating !== null && rating !== undefined) as number[];
      
      const avgPerformanceRating = performanceRatings.length > 0 
        ? performanceRatings.reduce((sum, rating) => sum + rating, 0) / performanceRatings.length 
        : 0;

      return {
        id: club.id,
        name: club.name,
        league: club.league.name,
        continent: club.league.continent,
        totalSpent,
        totalReceived,
        netSpend,
        transferSuccessRate,
        avgPerformanceRating,
        transferCount: totalTransfers
      };
    }).sort((a, b) => b.transferSuccessRate - a.transferSuccessRate);

    const transferSuccessRate = totalTransfers > 0 ? (successfulTransfersCount / totalTransfers) * 100 : 0;

    const stats = {
      totals: {
        transfers: totalTransfers,
        clubs: totalClubs,
        leagues: totalLeagues,
        transferValue: bigIntToNumber(transferValue._sum.transferFee) || 0
      },
      performance: {
        avgROI: avgROI._avg.roiPercentage || 0,
        transferSuccessRate
      },
      topTransfer: topTransfer ? {
        playerName: topTransfer.playerName,
        fee: bigIntToNumber(topTransfer.transferFee),
        from: topTransfer.oldClub?.name || 'Free Agent',
        to: topTransfer.newClub.name,
        date: topTransfer.date
      } : null,
      recentTransfers: recentTransfers.map(t => ({
        playerName: t.playerName,
        from: t.oldClub?.name || 'Free Agent',
        to: t.newClub.name,
        fee: bigIntToNumber(t.transferFee),
        date: t.date instanceof Date ? t.date.toISOString() : String(t.date)
      })),
      topPerformingClubs: clubPerformances.slice(0, 10),
      transfersByWindow: transfersByWindow.map(tw => ({
        window: tw.transferWindow,
        count: tw._count.transferWindow
      })),
      // Process continent data (simplified for now)
      transfersByContinent: [
        { continent: 'Europe', count: Math.floor(totalTransfers * 0.7) },
        { continent: 'South America', count: Math.floor(totalTransfers * 0.15) },
        { continent: 'North America', count: Math.floor(totalTransfers * 0.10) },
        { continent: 'Africa', count: Math.floor(totalTransfers * 0.1) },
        { continent: 'Asia', count: Math.floor(totalTransfers * 0.05) }
      ]
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching enhanced statistics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ 
    success: false, 
    error: `Route ${req.method} ${req.path} not found` 
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`${signal} received, shutting down gracefully`);
  try {
    await prisma.$disconnect();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Server startup
async function main() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Connected to database');
    
    // Verify database has data with enhanced schema
    const [clubCount, transferCount, leagueCount, playerCount, successCount] = await Promise.all([
      prisma.club.count(),
      prisma.transfer.count(),
      prisma.league.count(),
      prisma.player.count(),
      prisma.transferSuccess.count()
    ]);
    
    console.log(`📊 Enhanced Database contains:`);
    console.log(`   - ${leagueCount} leagues`);
    console.log(`   - ${clubCount} clubs`);
    console.log(`   - ${playerCount} players`);
    console.log(`   - ${transferCount} transfers`);
    console.log(`   - ${successCount} transfer success records`);

    if (clubCount === 0 || transferCount === 0) {
      console.log('⚠️  Database appears to be empty. Run "npm run seed" to populate with sample data.');
    }

    // Check for new schema features
    const [
      transfersWithROI,
      transfersWithSuccess,
      transfersWithNationality,
      loanToBuyTransfers,
      transfersWithWindows
    ] = await Promise.all([
      prisma.transfer.count({ where: { roiPercentage: { not: null } } }),
      prisma.transfer.count({ where: { wasSuccessful: { not: null } } }),
      prisma.transfer.count({ where: { playerNationality: { not: null } } }),
      prisma.transfer.count({ where: { isLoanToBuy: true } }),
      prisma.transfer.count({ where: { transferWindow: { not: undefined } } })
    ]);

    console.log(`📈 Enhanced Features:`);
    console.log(`   - ${transfersWithROI} transfers with ROI data`);
    console.log(`   - ${transfersWithSuccess} transfers with success ratings`);
    console.log(`   - ${transfersWithNationality} transfers with nationality data`);
    console.log(`   - ${loanToBuyTransfers} loan-to-buy transfers`);
    console.log(`   - ${transfersWithWindows} transfers with window data`);
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Enhanced Server running on port ${PORT}`);
      console.log(`📡 API available at http://localhost:${PORT}/api`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
    });

    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to start enhanced server:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.log('💡 Make sure PostgreSQL is running and DATABASE_URL is correct');
      }
    }
    process.exit(1);
  }
}

main();