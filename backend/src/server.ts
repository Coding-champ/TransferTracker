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

// Types
interface FilterParams {
  seasons?: string[];
  dateFrom?: string;
  dateTo?: string;
  leagues?: string[];
  countries?: string[];
  clubs?: number[];
  transferTypes?: string[];
  minTransferFee?: number;
  maxTransferFee?: number;
  hasTransferFee?: boolean;
  positions?: string[];
  minPlayerAge?: number;
  maxPlayerAge?: number;
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
  logoUrl?: string;
  clubValue?: number;
  stats: {
    transfersIn: number;
    transfersOut: number;
    totalSpent: number;
    totalReceived: number;
    netSpend: number;
    avgPlayerAge?: number;
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
  };
}

interface TransferInfo {
  id: number;
  playerName: string;
  transferFee: number | null;
  transferType: string;
  date: Date;
  position: string | null;
  playerAge?: number;
  direction: 'out' | 'in';
}

// Utility functions
const safeParseInt = (value: any, defaultValue: number = 0): number => {
  if (value === undefined || value === null || value === '') return defaultValue;
  const parsed = parseInt(String(value), 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

const safeParseArray = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  return String(value).split(',').filter(Boolean);
};

const bigIntToNumber = (value: bigint | null): number | null => {
  return value ? Number(value) : null;
};

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
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

// Get all leagues
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

    const formattedLeagues = leagues.map((league: { id: any; name: any; country: any; tier: any; seasonStartMonth: any; _count: { clubs: any; }; createdAt: any; }) => ({
      id: league.id,
      name: league.name,
      country: league.country,
      tier: league.tier,
      seasonStartMonth: league.seasonStartMonth,
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

// Get all clubs with optional league filter
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
            transfersOut: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    const formattedClubs = clubs.map((club: { id: any; name: any; shortName: any; league: { id: any; name: any; country: any; }; country: any; logoUrl: any; clubValue: bigint | null; foundingYear: any; stadiumCapacity: any; _count: { transfersIn: any; transfersOut: any; }; }) => ({
      id: club.id,
      name: club.name,
      shortName: club.shortName,
      league: {
        id: club.league.id,
        name: club.league.name,
        country: club.league.country
      },
      country: club.country,
      logoUrl: club.logoUrl,
      clubValue: bigIntToNumber(club.clubValue),
      foundingYear: club.foundingYear,
      stadiumCapacity: club.stadiumCapacity,
      transferCount: {
        in: club._count.transfersIn,
        out: club._count.transfersOut,
        total: club._count.transfersIn + club._count.transfersOut
      }
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
      data: seasons.map((s: { season: any; }) => s.season) 
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
      data: types.map((t: { transferType: any; }) => t.transferType) 
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
      data: positions.map((p: { playerPosition: any; }) => p.playerPosition).filter(Boolean)
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

// Get network data
app.get('/api/network-data', async (req, res) => {
  try {
    console.log('Received network-data request with query:', req.query);

    const filters: FilterParams = {
      seasons: safeParseArray(req.query.seasons),
      leagues: safeParseArray(req.query.leagues),
      countries: safeParseArray(req.query.countries),
      transferTypes: safeParseArray(req.query.transferTypes),
      positions: safeParseArray(req.query.positions),
      clubs: safeParseArray(req.query.clubs).map(id => safeParseInt(id)).filter(id => id > 0),
      minTransferFee: safeParseInt(req.query.minTransferFee),
      maxTransferFee: safeParseInt(req.query.maxTransferFee),
      minPlayerAge: safeParseInt(req.query.minPlayerAge),
      maxPlayerAge: safeParseInt(req.query.maxPlayerAge),
      hasTransferFee: req.query.hasTransferFee === 'true',
      excludeLoans: req.query.excludeLoans === 'true',
      limit: safeParseInt(req.query.limit, 1000)
    };

    // Build where clause for transfers
    const whereClause: any = {};
    
    // Season filter
    if (filters.seasons && filters.seasons.length > 0) {
      whereClause.season = { in: filters.seasons };
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

    // Position filter
    if (filters.positions && filters.positions.length > 0) {
      whereClause.playerPosition = { in: filters.positions };
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

    // League/Country/Club filters
    const clubFilters = [];
    
    if (filters.leagues && filters.leagues.length > 0) {
      clubFilters.push({ league: { name: { in: filters.leagues } } });
    }
    
    if (filters.countries && filters.countries.length > 0) {
      clubFilters.push({ country: { in: filters.countries } });
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

    console.log('Built where clause:', JSON.stringify(whereClause, (key, value) => 
      typeof value === 'bigint' ? value.toString() : value, 2));

    // Fetch transfers with related data
    const transfers = await prisma.transfer.findMany({
      where: whereClause,
      include: {
        oldClub: { include: { league: true } },
        newClub: { include: { league: true } }
      },
      take: filters.limit,
      orderBy: { date: 'desc' }
    });

    console.log(`Found ${transfers.length} transfers`);

    let response;
    if (transfers.length === 0) {
      response = {
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
      };
      return res.json(response);
    }

    // Build nodes and edges
    const clubsMap = new Map<number, NetworkNode>();
    const edgesMap = new Map<string, NetworkEdge>();

    transfers.forEach((transfer: { oldClub: any; newClub: any; transferFee: bigint | null; id: any; playerName: any; transferType: string; date: any; playerPosition: any; playerAgeAtTransfer: any; }) => {
      const oldClub = transfer.oldClub;
      const newClub = transfer.newClub;
      const transferValue = bigIntToNumber(transfer.transferFee) || 0;
      
      // Add new club to nodes
      if (!clubsMap.has(newClub.id)) {
        clubsMap.set(newClub.id, {
          id: `club_${newClub.id}`,
          name: newClub.name,
          shortName: newClub.shortName || undefined,
          league: newClub.league.name,
          country: newClub.country,
          logoUrl: newClub.logoUrl || undefined,
          clubValue: bigIntToNumber(newClub.clubValue) || undefined,
          stats: {
            transfersIn: 0,
            transfersOut: 0,
            totalSpent: 0,
            totalReceived: 0,
            netSpend: 0
          }
        });
      }

      // Add old club to nodes (if exists)
      if (oldClub && !clubsMap.has(oldClub.id)) {
        clubsMap.set(oldClub.id, {
          id: `club_${oldClub.id}`,
          name: oldClub.name,
          shortName: oldClub.shortName || undefined,
          league: oldClub.league.name,
          country: oldClub.country,
          logoUrl: oldClub.logoUrl || undefined,
          clubValue: bigIntToNumber(oldClub.clubValue) || undefined,
          stats: {
            transfersIn: 0,
            transfersOut: 0,
            totalSpent: 0,
            totalReceived: 0,
            netSpend: 0
          }
        });
      }

      // Update stats
      const newClubNode = clubsMap.get(newClub.id)!;
      newClubNode.stats.transfersIn++;
      newClubNode.stats.totalSpent += transferValue;

      if (oldClub) {
        const oldClubNode = clubsMap.get(oldClub.id)!;
        oldClubNode.stats.transfersOut++;
        oldClubNode.stats.totalReceived += transferValue;

        // Create edge
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
              types: []
            }
          });
        }

        const edge = edgesMap.get(edgeKey)!;
        edge.transfers.push({
          id: transfer.id,
          playerName: transfer.playerName,
          transferFee: transferValue || null,
          transferType: transfer.transferType,
          date: transfer.date,
          position: transfer.playerPosition,
          playerAge: transfer.playerAgeAtTransfer || undefined,
          direction: 'out'
        });
        
        edge.stats.transferCount++;
        edge.stats.totalValue += transferValue;
        
        if (!edge.stats.types.includes(transfer.transferType)) {
          edge.stats.types.push(transfer.transferType);
        }
      }
    });

    // Calculate net spend and averages
    clubsMap.forEach(club => {
      club.stats.netSpend = club.stats.totalSpent - club.stats.totalReceived;
    });

    edgesMap.forEach(edge => {
      if (edge.stats.transferCount > 0) {
        edge.stats.avgTransferValue = edge.stats.totalValue / edge.stats.transferCount;
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

    const totalValue = transfers.reduce((sum: number, t: { transferFee: bigint | null; }) => sum + (bigIntToNumber(t.transferFee) || 0), 0);

    response = {
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

// Get transfer details with pagination and filters
app.get('/api/transfers', async (req, res) => {
  try {
    const page = safeParseInt(req.query.page, 1);
    const limit = Math.min(safeParseInt(req.query.limit, 50), 200); // Max 200 per page
    const skip = (page - 1) * limit;

    // Build filters
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

    const [transfers, total] = await Promise.all([
      prisma.transfer.findMany({
        where: whereClause,
        include: {
          oldClub: { include: { league: true } },
          newClub: { include: { league: true } }
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit
      }),
      prisma.transfer.count({ where: whereClause })
    ]);

    const formattedTransfers = transfers.map((transfer: {
      id: any;
      playerName: any;
      transferFee: bigint | null;
      transferType: any;
      date: any;
      season: any;
      playerPosition: any;
      playerAgeAtTransfer: any;
      marketValue: bigint | null;
      contractDuration: any;
      oldClub: ({
        id: any;
        name: any;
        shortName: any;
        league: { name: any; };
        country: any;
      } | null);
      newClub: {
        id: any;
        name: any;
        shortName: any;
        league: { name: any; };
        country: any;
      };
    }) => ({
      id: transfer.id,
      playerName: transfer.playerName,
      transferFee: bigIntToNumber(transfer.transferFee),
      transferType: transfer.transferType,
      date: transfer.date,
      season: transfer.season,
      playerPosition: transfer.playerPosition,
      playerAge: transfer.playerAgeAtTransfer,
      marketValue: bigIntToNumber(transfer.marketValue),
      contractDuration: transfer.contractDuration,
      oldClub: transfer.oldClub ? {
        id: transfer.oldClub.id,
        name: transfer.oldClub.name,
        shortName: transfer.oldClub.shortName,
        league: transfer.oldClub.league.name,
        country: transfer.oldClub.country
      } : null,
      newClub: {
        id: transfer.newClub.id,
        name: transfer.newClub.name,
        shortName: transfer.newClub.shortName,
        league: transfer.newClub.league.name,
        country: transfer.newClub.country
      }
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

// Get statistics
app.get('/api/statistics', async (req, res) => {
  try {
    const [
      totalTransfers,
      totalClubs,
      totalLeagues,
      transferValue,
      topTransfer,
      recentTransfers
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
      })
    ]);

    const stats = {
      totals: {
        transfers: totalTransfers,
        clubs: totalClubs,
        leagues: totalLeagues,
        transferValue: bigIntToNumber(transferValue._sum.transferFee) || 0
      },
      topTransfer: topTransfer ? {
        playerName: topTransfer.playerName,
        fee: bigIntToNumber(topTransfer.transferFee),
        from: topTransfer.oldClub?.name || 'Free Agent',
        to: topTransfer.newClub.name,
        date: topTransfer.date
      } : null,
      recentTransfers: recentTransfers.map((t: { playerName: string; oldClub: { name: string } | null; newClub: { name: string }; transferFee: bigint | null; date: Date }) => ({
        playerName: t.playerName,
        from: t.oldClub?.name || 'Free Agent',
        to: t.newClub.name,
        fee: bigIntToNumber(t.transferFee),
        date: t.date instanceof Date ? t.date.toISOString() : String(t.date)
      }))
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching statistics:', error);
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
    
    // Verify database has data
    const [clubCount, transferCount, leagueCount] = await Promise.all([
      prisma.club.count(),
      prisma.transfer.count(),
      prisma.league.count()
    ]);
    
    console.log(`📊 Database contains:`);
    console.log(`   - ${leagueCount} leagues`);
    console.log(`   - ${clubCount} clubs`);
    console.log(`   - ${transferCount} transfers`);

    if (clubCount === 0 || transferCount === 0) {
      console.log('⚠️  Database appears to be empty. Run "npm run seed" to populate with sample data.');
    }
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
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
    console.error('❌ Failed to start server:', error);
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