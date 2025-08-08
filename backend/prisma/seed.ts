import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Kontinente Mapping
const CONTINENTS = {
  EUROPE: 'Europe',
  SOUTH_AMERICA: 'South America',
  NORTH_AMERICA: 'North America',
  AFRICA: 'Africa',
  ASIA: 'Asia'
};

// Transfer-Fenster
const TRANSFER_WINDOWS = {
  SUMMER: 'summer',
  WINTER: 'winter'
};

// Nationalitäten für diverse Spieler
const NATIONALITIES = [
  'Germany', 'England', 'Spain', 'Italy', 'France', 'Brazil', 'Argentina', 
  'Netherlands', 'Portugal', 'Belgium', 'Croatia', 'Poland', 'Denmark',
  'Sweden', 'Norway', 'Austria', 'Switzerland', 'Czech Republic', 'Hungary',
  'Serbia', 'Ukraine', 'Turkey', 'Morocco', 'Algeria', 'Nigeria', 'Ghana',
  'Senegal', 'Ivory Coast', 'Japan', 'South Korea', 'Australia', 'USA',
  'Mexico', 'Colombia', 'Uruguay', 'Chile', 'Ecuador', 'Peru'
];

// Spielerpositionen
const POSITIONS = [
  'Goalkeeper', 'Centre-Back', 'Left-Back', 'Right-Back', 'Defensive Midfield',
  'Central Midfield', 'Attacking Midfield', 'Left Midfield', 'Right Midfield',
  'Left Winger', 'Right Winger', 'Centre-Forward', 'Second Striker'
];

// Realistische Spielernamen für verschiedene Nationalitäten
const PLAYER_NAMES = {
  German: ['Max Müller', 'Leon Schmidt', 'Lukas Weber', 'Jonas Fischer', 'David Meyer', 'Tim Wagner', 'Niklas Bauer'],
  English: ['Harry Johnson', 'James Smith', 'Oliver Brown', 'Jack Wilson', 'Charlie Davies', 'George Evans', 'Tom Roberts'],
  Spanish: ['Carlos García', 'Diego Martínez', 'Pablo López', 'Sergio Rodríguez', 'Álvaro Fernández', 'Marco Silva'],
  Italian: ['Marco Rossi', 'Luca Romano', 'Andrea Conti', 'Francesco Bianchi', 'Alessandro Greco', 'Matteo Villa'],
  French: ['Antoine Dubois', 'Kylian Martin', 'Lucas Bernard', 'Hugo Petit', 'Alexandre Moreau', 'Théo Laurent'],
  Brazilian: ['João Silva', 'Gabriel Santos', 'Matheus Oliveira', 'Lucas Pereira', 'Rafael Costa', 'Bruno Almeida'],
  Argentine: ['Mateo González', 'Santiago Rodríguez', 'Emiliano Martínez', 'Nicolás López', 'Facundo García'],
  Dutch: ['Daan de Jong', 'Lars van den Berg', 'Sem Bakker', 'Thijs Visser', 'Stijn Janssen', 'Milan Peters'],
  Portuguese: ['João Pereira', 'Diogo Silva', 'André Santos', 'Rúben Costa', 'Gonçalo Ferreira', 'Miguel Sousa']
};

async function main() {
  console.log('🌱 Starting enhanced database seeding...');

  // FIXED: Datenbankverbindung prüfen
  console.log('🔧 Checking database connection...');
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  // Clear existing data
  console.log('🧹 Clearing existing data in correct order...');
  // FIXED: Korrekte Reihenfolge für Foreign Key Constraints
  await prisma.transferSuccess.deleteMany({});
  await prisma.playerTransfer.deleteMany({});
  await prisma.leaguePerformance.deleteMany({});
  await prisma.transfer.deleteMany({}); // Transfers vor Players löschen
  await prisma.player.deleteMany({});
  await prisma.club.deleteMany({});
  await prisma.league.deleteMany({});

  // Create leagues with enhanced data
  console.log('🏆 Creating leagues...');
  const leagues = await Promise.all([
    // Tier 1 European Leagues
    prisma.league.create({
      data: {
        name: 'Bundesliga',
        country: 'Germany',
        continent: CONTINENTS.EUROPE,
        tier: 1,
        uefaCoefficient: 85.5,
        seasonStartMonth: 8
      }
    }),
    prisma.league.create({
      data: {
        name: 'Premier League',
        country: 'England',
        continent: CONTINENTS.EUROPE,
        tier: 1,
        uefaCoefficient: 92.3,
        seasonStartMonth: 8
      }
    }),
    prisma.league.create({
      data: {
        name: 'La Liga',
        country: 'Spain',
        continent: CONTINENTS.EUROPE,
        tier: 1,
        uefaCoefficient: 88.7,
        seasonStartMonth: 8
      }
    }),
    prisma.league.create({
      data: {
        name: 'Serie A',
        country: 'Italy',
        continent: CONTINENTS.EUROPE,
        tier: 1,
        uefaCoefficient: 79.2,
        seasonStartMonth: 8
      }
    }),
    prisma.league.create({
      data: {
        name: 'Ligue 1',
        country: 'France',
        continent: CONTINENTS.EUROPE,
        tier: 1,
        uefaCoefficient: 58.9,
        seasonStartMonth: 8
      }
    }),
    // Tier 2 European Leagues
    prisma.league.create({
      data: {
        name: '2. Bundesliga',
        country: 'Germany',
        continent: CONTINENTS.EUROPE,
        tier: 2,
        uefaCoefficient: 35.2,
        seasonStartMonth: 8
      }
    }),
    prisma.league.create({
      data: {
        name: 'Championship',
        country: 'England',
        continent: CONTINENTS.EUROPE,
        tier: 2,
        uefaCoefficient: 42.1,
        seasonStartMonth: 8
      }
    }),
    // Other Continents
    prisma.league.create({
      data: {
        name: 'Série A',
        country: 'Brazil',
        continent: CONTINENTS.SOUTH_AMERICA,
        tier: 1,
        uefaCoefficient: 65.4,
        seasonStartMonth: 4
      }
    }),
    prisma.league.create({
      data: {
        name: 'Primera División',
        country: 'Argentina',
        continent: CONTINENTS.SOUTH_AMERICA,
        tier: 1,
        uefaCoefficient: 58.7,
        seasonStartMonth: 2
      }
    }),
    prisma.league.create({
      data: {
        name: 'MLS',
        country: 'USA',
        continent: CONTINENTS.NORTH_AMERICA,
        tier: 1,
        uefaCoefficient: 25.8,
        seasonStartMonth: 3
      }
    })
  ]);

  // Create clubs with enhanced data
  console.log('⚽ Creating clubs...');
  const clubs: any[] = [];
  
  const clubsData = [
    // Bundesliga
    { name: 'Bayern München', shortName: 'Bayern', city: 'Munich', league: 'Bundesliga', country: 'Germany', value: 3000000000n, stadium: 75000 },
    { name: 'Borussia Dortmund', shortName: 'BVB', city: 'Dortmund', league: 'Bundesliga', country: 'Germany', value: 1200000000n, stadium: 81365 },
    { name: 'RB Leipzig', shortName: 'Leipzig', city: 'Leipzig', league: 'Bundesliga', country: 'Germany', value: 800000000n, stadium: 47069 },
    { name: 'Bayer Leverkusen', shortName: 'Leverkusen', city: 'Leverkusen', league: 'Bundesliga', country: 'Germany', value: 600000000n, stadium: 30210 },
    
    // Premier League
    { name: 'Manchester City', shortName: 'Man City', city: 'Manchester', league: 'Premier League', country: 'England', value: 4000000000n, stadium: 55097 },
    { name: 'Liverpool FC', shortName: 'Liverpool', city: 'Liverpool', league: 'Premier League', country: 'England', value: 3500000000n, stadium: 54074 },
    { name: 'Manchester United', shortName: 'Man United', city: 'Manchester', league: 'Premier League', country: 'England', value: 3200000000n, stadium: 74879 },
    { name: 'Arsenal FC', shortName: 'Arsenal', city: 'London', league: 'Premier League', country: 'England', value: 2800000000n, stadium: 60704 },
    { name: 'Chelsea FC', shortName: 'Chelsea', city: 'London', league: 'Premier League', country: 'England', value: 2500000000n, stadium: 40834 },
    
    // La Liga
    { name: 'Real Madrid', shortName: 'Real', city: 'Madrid', league: 'La Liga', country: 'Spain', value: 5000000000n, stadium: 81044 },
    { name: 'FC Barcelona', shortName: 'Barça', city: 'Barcelona', league: 'La Liga', country: 'Spain', value: 4500000000n, stadium: 99354 },
    { name: 'Atlético Madrid', shortName: 'Atlético', city: 'Madrid', league: 'La Liga', country: 'Spain', value: 1000000000n, stadium: 68456 },
    { name: 'Sevilla FC', shortName: 'Sevilla', city: 'Sevilla', league: 'La Liga', country: 'Spain', value: 400000000n, stadium: 43883 },
    
    // Serie A
    { name: 'Juventus FC', shortName: 'Juventus', city: 'Turin', league: 'Serie A', country: 'Italy', value: 1800000000n, stadium: 41507 },
    { name: 'AC Milan', shortName: 'Milan', city: 'Milan', league: 'Serie A', country: 'Italy', value: 1200000000n, stadium: 80018 },
    { name: 'Inter Milan', shortName: 'Inter', city: 'Milan', league: 'Serie A', country: 'Italy', value: 1000000000n, stadium: 80018 },
    { name: 'AS Roma', shortName: 'Roma', city: 'Rome', league: 'Serie A', country: 'Italy', value: 600000000n, stadium: 70634 },
    
    // Ligue 1
    { name: 'Paris Saint-Germain', shortName: 'PSG', city: 'Paris', league: 'Ligue 1', country: 'France', value: 2800000000n, stadium: 47929 },
    { name: 'Olympique de Marseille', shortName: 'Marseille', city: 'Marseille', league: 'Ligue 1', country: 'France', value: 300000000n, stadium: 67394 },
    { name: 'AS Monaco', shortName: 'Monaco', city: 'Monaco', league: 'Ligue 1', country: 'France', value: 500000000n, stadium: 18523 },
    
    // 2nd Tier
    { name: 'Hamburger SV', shortName: 'HSV', city: 'Hamburg', league: '2. Bundesliga', country: 'Germany', value: 150000000n, stadium: 57000 },
    { name: 'FC Schalke 04', shortName: 'Schalke', city: 'Gelsenkirchen', league: '2. Bundesliga', country: 'Germany', value: 200000000n, stadium: 62271 },
    { name: 'Leeds United', shortName: 'Leeds', city: 'Leeds', league: 'Championship', country: 'England', value: 180000000n, stadium: 37890 },
    
    // South America
    { name: 'Flamengo', shortName: 'Fla', city: 'Rio de Janeiro', league: 'Série A', country: 'Brazil', value: 200000000n, stadium: 78838 },
    { name: 'Palmeiras', shortName: 'Palmeiras', city: 'São Paulo', league: 'Série A', country: 'Brazil', value: 180000000n, stadium: 43713 },
    { name: 'Boca Juniors', shortName: 'Boca', city: 'Buenos Aires', league: 'Primera División', country: 'Argentina', value: 120000000n, stadium: 54000 },
    { name: 'River Plate', shortName: 'River', city: 'Buenos Aires', league: 'Primera División', country: 'Argentina', value: 100000000n, stadium: 70074 },
    
    // MLS
    { name: 'LA Galaxy', shortName: 'Galaxy', city: 'Los Angeles', league: 'MLS', country: 'USA', value: 80000000n, stadium: 27000 },
    { name: 'Atlanta United', shortName: 'Atlanta', city: 'Atlanta', league: 'MLS', country: 'USA', value: 85000000n, stadium: 42500 }
  ];

  for (const clubData of clubsData) {
    const league = leagues.find(l => l.name === clubData.league);
    if (league) {
      const club = await prisma.club.create({
        data: {
          name: clubData.name,
          shortName: clubData.shortName,
          city: clubData.city,
          country: clubData.country,
          clubValue: clubData.value,
          stadiumCapacity: clubData.stadium,
          foundingYear: Math.floor(Math.random() * 50) + 1900,
          leagueId: league.id
        }
      });
      clubs.push(club);
    }
  }

  console.log('👥 Creating players...');
  const players = [];
  const playerNames = Object.values(PLAYER_NAMES).flat();
  
  for (let i = 0; i < 200; i++) {
    const nationality = NATIONALITIES[Math.floor(Math.random() * NATIONALITIES.length)];
    const name = playerNames[Math.floor(Math.random() * playerNames.length)] + ` ${i}`;
    const currentClub = clubs[Math.floor(Math.random() * clubs.length)];
    
    const player = await prisma.player.create({
      data: {
        name: name,
        nationality: nationality,
        position: POSITIONS[Math.floor(Math.random() * POSITIONS.length)],
        dateOfBirth: new Date(1990 + Math.floor(Math.random() * 15), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        currentClubId: currentClub.id
      }
    });
    players.push(player);
  }

  console.log('💰 Creating enhanced transfers...');
  const transfers: { id: number; createdAt: Date; updatedAt: Date; playerName: string; playerNationality: string | null; playerPosition: string | null; playerAgeAtTransfer: number | null; marketValueAtTransfer: bigint | null; transferFee: bigint | null; transferType: string; transferWindow: string; date: Date; season: string; contractDuration: number | null; isLoanToBuy: boolean; originalLoanId: number | null; wasSuccessful: boolean | null; roiPercentage: number | null; oldClubId: number | null; newClubId: number; source: string | null; externalId: string | null; }[] = [];
  
  // Helper function to create realistic transfers
  const createTransfer = async (data: any) => {
    const transfer = await prisma.transfer.create({ data });
    transfers.push(transfer);
    return transfer;
  };

  // Transfer scenarios for different seasons
  const seasons = ['2022/23', '2023/24', '2024/25'];
  
  for (const season of seasons) {
    const isCurrentSeason = season === '2024/25';
    const transferCount = isCurrentSeason ? 150 : 200; // Weniger Transfers in aktueller Saison
    
    for (let i = 0; i < transferCount; i++) {
      const player = players[Math.floor(Math.random() * players.length)];
      const newClub = clubs[Math.floor(Math.random() * clubs.length)];
      let oldClub = null;
      
      // 80% der Transfers haben einen alten Club
      if (Math.random() > 0.2) {
        oldClub = clubs[Math.floor(Math.random() * clubs.length)];
        // Stelle sicher, dass alter und neuer Club unterschiedlich sind
        while (oldClub.id === newClub.id) {
          oldClub = clubs[Math.floor(Math.random() * clubs.length)];
        }
      }

      // Transfer-Typ bestimmen
      const transferTypes = ['sale', 'loan', 'free', 'loan_with_option'];
      let transferType = transferTypes[Math.floor(Math.random() * transferTypes.length)];
      
      // Transfer-Fenster bestimmen (70% Sommer, 30% Winter)
      const transferWindow = Math.random() > 0.3 ? TRANSFER_WINDOWS.SUMMER : TRANSFER_WINDOWS.WINTER;
      
      // Transfer-Datum basierend auf Saison und Fenster
      let transferDate: Date;
      const seasonYear = parseInt(season.split('/')[0]);
      
      if (transferWindow === TRANSFER_WINDOWS.SUMMER) {
        transferDate = new Date(seasonYear, 6 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 30) + 1); // Juli-August
      } else {
        transferDate = new Date(seasonYear + 1, Math.floor(Math.random() * 2), Math.floor(Math.random() * 30) + 1); // Januar-Februar
      }

      // Transfer-Fee basierend auf Liga-Tier und Transfer-Typ
      let transferFee: bigint | null = null;
      let marketValue: bigint | null = null;
      
      if (transferType !== 'free' && transferType !== 'loan') {
        // Basis-Marktwert abhängig von Liga-Tier
        const newClubLeague = leagues.find(l => l.id === newClub.leagueId);
        const oldClubLeague = oldClub ? leagues.find(l => l.id === oldClub.leagueId) : null;
        
        let baseValue = 1000000; // 1M Base
        if (newClubLeague?.tier === 1) baseValue *= (2 + Math.random() * 8); // 2-10M für Tier 1
        if (newClubLeague?.tier === 2) baseValue *= (0.5 + Math.random() * 2); // 0.5-2.5M für Tier 2
        
        marketValue = BigInt(Math.floor(baseValue));
        
        // Transfer-Fee ist normalerweise 80-120% des Marktwerts
        const feeMultiplier = 0.8 + Math.random() * 0.4;
        transferFee = BigInt(Math.floor(Number(marketValue) * feeMultiplier));
      }

      // Vertragslaufzeit (1-5 Jahre, meist 3-4)
      const contractDuration = Math.random() > 0.8 ? 
        (Math.random() > 0.5 ? 1 : 5) : // 20% Chance auf 1 oder 5 Jahre
        (Math.random() > 0.5 ? 3 : 4); // 80% Chance auf 3 oder 4 Jahre

      const transferData = {
        playerName: player.name,
        playerNationality: player.nationality,
        playerPosition: player.position,
        playerAgeAtTransfer: Math.floor((transferDate.getTime() - player.dateOfBirth!.getTime()) / (365.25 * 24 * 60 * 60 * 1000)),
        marketValueAtTransfer: marketValue,
        transferFee: transferFee,
        transferType: transferType,
        transferWindow: transferWindow,
        date: transferDate,
        season: season,
        contractDuration: contractDuration,
        oldClubId: oldClub?.id || null,
        newClubId: newClub.id,
        source: 'seed_data'
      };

      await createTransfer(transferData);
    }
  }

  // Erstelle Loan-to-Buy Ketten
  console.log('🔄 Creating loan-to-buy chains...');
  const loanTransfers = transfers.filter(t => t.transferType === 'loan_with_option');
  
  for (let i = 0; i < Math.min(20, loanTransfers.length); i++) {
    const loanTransfer = loanTransfers[i];
    
    // 60% Chance dass Loan-to-Buy aktiviert wird
    if (Math.random() > 0.4) {
      const purchaseDate = new Date(loanTransfer.date);
      purchaseDate.setFullYear(purchaseDate.getFullYear() + 1); // Ein Jahr später
      
      const purchaseValue = loanTransfer.marketValueAtTransfer ? 
        BigInt(Math.round(Number(loanTransfer.marketValueAtTransfer) * (1.1 + Math.random() * 0.3))) : // 10-40% Wertsteigerung
        BigInt(5000000 + Math.random() * 15000000); // 5-20M falls kein Marktwert

      await createTransfer({
        playerName: loanTransfer.playerName,
        playerNationality: loanTransfer.playerNationality,
        playerPosition: loanTransfer.playerPosition,
        playerAgeAtTransfer: loanTransfer.playerAgeAtTransfer! + 1,
        marketValueAtTransfer: purchaseValue,
        transferFee: purchaseValue,
        transferType: 'loan_to_buy',
        transferWindow: loanTransfer.transferWindow,
        date: purchaseDate,
        season: purchaseDate.getFullYear() + '/' + (purchaseDate.getFullYear() + 1).toString().slice(-2),
        contractDuration: 3 + Math.floor(Math.random() * 3), // 3-5 Jahre
        oldClubId: loanTransfer.oldClubId,
        newClubId: loanTransfer.newClubId,
        isLoanToBuy: true,
        originalLoanId: loanTransfer.id,
        source: 'seed_data'
      });
    }
  }

  // Erstelle spezifische Pattern-Test-Daten
  console.log('🎯 Creating pattern-specific test data...');
  
  // 1. Loan Highways Pattern (3+ loans zwischen gleichen Clubs)
  console.log('🛣️ Creating Loan Highways pattern...');
  const loanHubs = [
    { from: clubs.find(c => c.name === 'Chelsea FC'), to: clubs.find(c => c.name === 'Leeds United') },
    { from: clubs.find(c => c.name === 'Manchester City'), to: clubs.find(c => c.name === 'Hamburger SV') },
    { from: clubs.find(c => c.name === 'Bayern München'), to: clubs.find(c => c.name === 'FC Schalke 04') }
  ];

  for (const hub of loanHubs) {
    if (hub.from && hub.to) {
      // Erstelle 4-5 Loans zwischen diesen Clubs
      for (let i = 0; i < 4 + Math.floor(Math.random() * 2); i++) {
        const loanPlayer = players[Math.floor(Math.random() * players.length)];
        const loanDate = new Date(2023, 6 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 30) + 1);
        
        await createTransfer({
          playerName: `${loanPlayer.name} Loan ${i}`,
          playerNationality: loanPlayer.nationality,
          playerPosition: loanPlayer.position,
          playerAgeAtTransfer: 18 + Math.floor(Math.random() * 8),
          marketValueAtTransfer: BigInt(2000000 + Math.random() * 8000000),
          transferFee: null, // Loans don't have transfer fees
          transferType: 'loan',
          transferWindow: TRANSFER_WINDOWS.SUMMER,
          date: loanDate,
          season: '2023/24',
          contractDuration: 1,
          oldClubId: hub.from.id,
          newClubId: hub.to.id,
          source: 'loan_highway_pattern'
        });
      }
    }
  }

  // 2. Big Money Flows Pattern (>€50M total value)
  console.log('💰 Creating Big Money Flows pattern...');
  const bigMoneyRoutes = [
    { from: clubs.find(c => c.name === 'Real Madrid'), to: clubs.find(c => c.name === 'Paris Saint-Germain') },
    { from: clubs.find(c => c.name === 'FC Barcelona'), to: clubs.find(c => c.name === 'Manchester City') },
    { from: clubs.find(c => c.name === 'Liverpool FC'), to: clubs.find(c => c.name === 'Bayern München') }
  ];

  for (const route of bigMoneyRoutes) {
    if (route.from && route.to) {
      // Erstelle 2-3 sehr teure Transfers um >€50M zu erreichen
      for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
        const starPlayer = players[Math.floor(Math.random() * players.length)];
        const transferValue = BigInt(25000000 + Math.random() * 75000000); // €25M - €100M
        
        await createTransfer({
          playerName: `${starPlayer.name} Star ${i}`,
          playerNationality: starPlayer.nationality,
          playerPosition: starPlayer.position,
          playerAgeAtTransfer: 23 + Math.floor(Math.random() * 5),
          marketValueAtTransfer: transferValue,
          transferFee: transferValue,
          transferType: 'sale',
          transferWindow: TRANSFER_WINDOWS.SUMMER,
          date: new Date(2023, 6, Math.floor(Math.random() * 30) + 1),
          season: '2023/24',
          contractDuration: 4 + Math.floor(Math.random() * 2),
          oldClubId: route.from.id,
          newClubId: route.to.id,
          source: 'big_money_pattern'
        });
      }
    }
  }

  // 3. Youth Talent Pipelines Pattern (2+ transfers of players ≤21)
  console.log('🌱 Creating Youth Talent Pipelines pattern...');
  const youthPipelines = [
    { from: clubs.find(c => c.name === 'Flamengo'), to: clubs.find(c => c.name === 'Real Madrid') },
    { from: clubs.find(c => c.name === 'River Plate'), to: clubs.find(c => c.name === 'AC Milan') },
    { from: clubs.find(c => c.name === 'Palmeiras'), to: clubs.find(c => c.name === 'Manchester United') }
  ];

  for (const pipeline of youthPipelines) {
    if (pipeline.from && pipeline.to) {
      // Erstelle 3-4 junge Spieler Transfers
      for (let i = 0; i < 3 + Math.floor(Math.random() * 2); i++) {
        const youngPlayer = players[Math.floor(Math.random() * players.length)];
        
        await createTransfer({
          playerName: `${youngPlayer.name} Youth ${i}`,
          playerNationality: youngPlayer.nationality,
          playerPosition: youngPlayer.position,
          playerAgeAtTransfer: 16 + Math.floor(Math.random() * 6), // 16-21 Jahre alt
          marketValueAtTransfer: BigInt(5000000 + Math.random() * 15000000),
          transferFee: BigInt(3000000 + Math.random() * 12000000),
          transferType: 'sale',
          transferWindow: TRANSFER_WINDOWS.SUMMER,
          date: new Date(2023, 6, Math.floor(Math.random() * 30) + 1),
          season: '2023/24',
          contractDuration: 5,
          oldClubId: pipeline.from.id,
          newClubId: pipeline.to.id,
          source: 'youth_pipeline_pattern'
        });
      }
    }
  }

  // 4. Circular Trading Pattern (5+ transfers between clubs)
  console.log('🔄 Creating Circular Trading pattern...');
  const tradingPairs = [
    { club1: clubs.find(c => c.name === 'Juventus FC'), club2: clubs.find(c => c.name === 'Inter Milan') },
    { club1: clubs.find(c => c.name === 'Borussia Dortmund'), club2: clubs.find(c => c.name === 'RB Leipzig') },
    { club1: clubs.find(c => c.name === 'Arsenal FC'), club2: clubs.find(c => c.name === 'Chelsea FC') }
  ];

  for (const pair of tradingPairs) {
    if (pair.club1 && pair.club2) {
      // Erstelle 6-8 Transfers in beide Richtungen
      for (let i = 0; i < 6 + Math.floor(Math.random() * 3); i++) {
        const tradingPlayer = players[Math.floor(Math.random() * players.length)];
        const direction = Math.random() > 0.5;
        const fromClub = direction ? pair.club1 : pair.club2;
        const toClub = direction ? pair.club2 : pair.club1;
        
        await createTransfer({
          playerName: `${tradingPlayer.name} Trade ${i}`,
          playerNationality: tradingPlayer.nationality,
          playerPosition: tradingPlayer.position,
          playerAgeAtTransfer: 20 + Math.floor(Math.random() * 8),
          marketValueAtTransfer: BigInt(10000000 + Math.random() * 20000000),
          transferFee: BigInt(8000000 + Math.random() * 18000000),
          transferType: Math.random() > 0.7 ? 'loan' : 'sale',
          transferWindow: Math.random() > 0.5 ? TRANSFER_WINDOWS.SUMMER : TRANSFER_WINDOWS.WINTER,
          date: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
          season: '2023/24',
          contractDuration: 2 + Math.floor(Math.random() * 4),
          oldClubId: fromClub.id,
          newClubId: toClub.id,
          source: 'circular_trading_pattern'
        });
      }
    }
  }

  // 5. League Bridges Pattern (3+ transfers between different leagues)
  console.log('🌉 Creating League Bridges pattern...');
  const leagueBridges = [
    { 
      from: clubs.filter(c => c.country === 'Germany'), 
      to: clubs.filter(c => c.country === 'England'),
      name: 'Bundesliga-Premier Bridge'
    },
    { 
      from: clubs.filter(c => c.country === 'Spain'), 
      to: clubs.filter(c => c.country === 'Italy'),
      name: 'La Liga-Serie A Bridge'
    },
    { 
      from: clubs.filter(c => c.country === 'Brazil'), 
      to: clubs.filter(c => c.country === 'France'),
      name: 'Brazil-Ligue 1 Bridge'
    }
  ];

  for (const bridge of leagueBridges) {
    if (bridge.from.length > 0 && bridge.to.length > 0) {
      // Wähle spezifische Club-Paare für Bridges
      const fromClub = bridge.from[Math.floor(Math.random() * bridge.from.length)];
      const toClub = bridge.to[Math.floor(Math.random() * bridge.to.length)];
      
      // Erstelle 4-5 Transfers für diese Bridge
      for (let i = 0; i < 4 + Math.floor(Math.random() * 2); i++) {
        const bridgePlayer = players[Math.floor(Math.random() * players.length)];
        
        await createTransfer({
          playerName: `${bridgePlayer.name} Bridge ${i}`,
          playerNationality: bridgePlayer.nationality,
          playerPosition: bridgePlayer.position,
          playerAgeAtTransfer: 21 + Math.floor(Math.random() * 7),
          marketValueAtTransfer: BigInt(15000000 + Math.random() * 25000000),
          transferFee: BigInt(12000000 + Math.random() * 23000000),
          transferType: 'sale',
          transferWindow: TRANSFER_WINDOWS.SUMMER,
          date: new Date(2023, 6, Math.floor(Math.random() * 30) + 1),
          season: '2023/24',
          contractDuration: 3 + Math.floor(Math.random() * 3),
          oldClubId: fromClub.id,
          newClubId: toClub.id,
          source: `league_bridge_${bridge.name.toLowerCase().replace(/ /g, '_')}`
        });
      }
    }
  }

  // 6. Success Stories Pattern (≥75% success rate transfers)
  console.log('⭐ Creating Success Stories pattern...');
  const successfulRoutes = [
    { from: clubs.find(c => c.name === 'AS Monaco'), to: clubs.find(c => c.name === 'Liverpool FC') },
    { from: clubs.find(c => c.name === 'Borussia Dortmund'), to: clubs.find(c => c.name === 'Manchester City') },
    { from: clubs.find(c => c.name === 'Sevilla FC'), to: clubs.find(c => c.name === 'Arsenal FC') }
  ];

  for (const route of successfulRoutes) {
    if (route.from && route.to) {
      // Erstelle 4-5 erfolgreiche Transfers
      for (let i = 0; i < 4 + Math.floor(Math.random() * 2); i++) {
        const successPlayer = players[Math.floor(Math.random() * players.length)];
        const transferValue = BigInt(20000000 + Math.random() * 30000000);
        
        const successTransfer = await createTransfer({
          playerName: `${successPlayer.name} Success ${i}`,
          playerNationality: successPlayer.nationality,
          playerPosition: successPlayer.position,
          playerAgeAtTransfer: 22 + Math.floor(Math.random() * 6),
          marketValueAtTransfer: transferValue,
          transferFee: transferValue,
          transferType: 'sale',
          transferWindow: TRANSFER_WINDOWS.SUMMER,
          date: new Date(2022, 6, Math.floor(Math.random() * 30) + 1), // Älterer Transfer für Bewertung
          season: '2022/23',
          contractDuration: 4,
          oldClubId: route.from.id,
          newClubId: route.to.id,
          wasSuccessful: true, // Explizit als erfolgreich markieren
          source: 'success_story_pattern'
        });

        // Erstelle erfolgreiche Transfer-Metriken
        await prisma.transferSuccess.create({
          data: {
            transferId: successTransfer.id,
            performanceRating: 8.0 + Math.random() * 2.0, // 8.0-10.0 Rating
            marketValueGrowth: BigInt(Math.round(Number(transferValue) * (0.3 + Math.random() * 0.7))), // +30% bis +100%
            contractExtensions: 1 + Math.floor(Math.random() * 2),
            trophiesWon: 1 + Math.floor(Math.random() * 3),
            evaluatedAfterYears: 2,
            lastEvaluated: new Date()
          }
        });
      }
    }
  }

  // FIXED: Erstelle Spieler-Karriere-Ketten (gleicher Spieler, mehrere Transfers)
  console.log('📈 Creating player career chains...');
  for (let i = 0; i < 30; i++) {
    const player = players[Math.floor(Math.random() * players.length)];
    const careerTransfers = [];
    
    // Karriere-Progression: Klein → Mittel → Groß
    const smallClubs = clubs.filter(c => c.clubValue! < 200000000n);
    const mediumClubs = clubs.filter(c => c.clubValue! >= 200000000n && c.clubValue! < 1000000000n);
    const bigClubs = clubs.filter(c => c.clubValue! >= 1000000000n);
    
    // Stelle sicher, dass wir Clubs haben
    if (smallClubs.length === 0 || mediumClubs.length === 0 || bigClubs.length === 0) {
      continue;
    }
    
    const careerClubs = [
      smallClubs[Math.floor(Math.random() * smallClubs.length)],
      mediumClubs[Math.floor(Math.random() * mediumClubs.length)],
      bigClubs[Math.floor(Math.random() * bigClubs.length)]
    ];

    let currentValue = BigInt(Math.round(500000 + Math.random() * 2000000)); // Start: 0.5-2.5M
    
    for (let transferIndex = 1; transferIndex < careerClubs.length; transferIndex++) {
      const oldClub = careerClubs[transferIndex - 1];
      const newClub = careerClubs[transferIndex];
      
      // Wertsteigerung bei jedem Transfer
      const valueIncrease = 1.5 + Math.random() * 2; // 1.5x - 3.5x Steigerung
      const newValue = BigInt(Math.floor(Number(currentValue) * valueIncrease));
      
      const transferDate = new Date(2022 + transferIndex, 6, Math.floor(Math.random() * 30) + 1);
      const season = transferDate.getFullYear() + '/' + (transferDate.getFullYear() + 1).toString().slice(-2);
      
      try {
        const careerTransfer = await createTransfer({
          playerName: player.name,
          playerNationality: player.nationality,
          playerPosition: player.position,
          playerAgeAtTransfer: Math.max(16, 20 + transferIndex * 2), // Mindestens 16 Jahre
          marketValueAtTransfer: newValue,
          transferFee: BigInt(Math.floor(Number(newValue) * (0.9 + Math.random() * 0.2))), // 90-110% des Marktwerts
          transferType: 'sale',
          transferWindow: TRANSFER_WINDOWS.SUMMER,
          date: transferDate,
          season: season,
          contractDuration: 3 + Math.floor(Math.random() * 2),
          oldClubId: oldClub.id,
          newClubId: newClub.id,
          source: 'career_progression'
        });
        
        careerTransfers.push(careerTransfer);
        currentValue = newValue;
        
        // FIXED: Player-Transfer History erstellen mit besserer Fehlerbehandlung
        try {
          await prisma.playerTransfer.create({
            data: {
              playerId: player.id,
              transferId: careerTransfer.id,
              gamesPlayed: 20 + Math.floor(Math.random() * 15), // 20-35 Spiele
              goalsScored: player.position?.includes('Forward') || player.position?.includes('Winger') ? 
                Math.floor(Math.random() * 15) : Math.floor(Math.random() * 5), // Mehr Tore für Stürmer
              marketValueEnd: BigInt(Math.floor(Number(newValue) * (1.1 + Math.random() * 0.4))), // Wertsteigerung während der Zeit
              wasRegularStarter: Math.random() > 0.3 // 70% Chance auf Stammplatz
            }
          });
        } catch (error) {
          console.warn(`⚠️ Could not create PlayerTransfer for ${player.name}:`, error);
        }
      } catch (error) {
        console.warn(`⚠️ Could not create career transfer for ${player.name}:`, error);
        break;
      }
    }
  }

  // Erstelle Transfer-Erfolg Metriken
  console.log('📊 Creating transfer success metrics...');
  const successfulTransfers = transfers.filter(t => t.transferFee && Number(t.transferFee) > 5000000); // Nur teure Transfers bewerten
  
  for (let i = 0; i < Math.min(50, successfulTransfers.length); i++) {
    const transfer = successfulTransfers[i];
    
    await prisma.transferSuccess.create({
      data: {
        transferId: transfer.id,
        performanceRating: 3 + Math.random() * 7, // 3-10 Rating
        marketValueGrowth: transfer.marketValueAtTransfer ? 
          BigInt(Math.round(Number(transfer.marketValueAtTransfer) * (Math.random() * 0.8 - 0.2))) : // -20% bis +60% Wertsteigerung
          BigInt(Math.random() * 10000000 - 2000000), // -2M bis +8M
        contractExtensions: Math.floor(Math.random() * 3), // 0-2 Verlängerungen
        trophiesWon: Math.floor(Math.random() * 4), // 0-3 Titel
        evaluatedAfterYears: 1 + Math.floor(Math.random() * 3), // Nach 1-3 Jahren bewertet
        lastEvaluated: new Date()
      }
    });
  }

  // Erstelle Liga-Performance Daten
  console.log('🏆 Creating league performance data...');
  for (const league of leagues) {
    for (const season of seasons) {
      const leagueTransfers = transfers.filter(t => {
        const club = clubs.find(c => c.id === t.newClubId);
        return club?.leagueId === league.id && t.season === season;
      });
      
      const totalFees = leagueTransfers
        .filter(t => t.transferFee)
        .reduce((sum, t) => sum + Number(t.transferFee!), 0);
      
      const avgFee = leagueTransfers.length > 0 ? totalFees / leagueTransfers.length : 0;
      
      // Top-Spending Club in dieser Liga
      const clubSpending = new Map<number, number>();
      leagueTransfers.forEach(t => {
        if (t.transferFee) {
          const current = clubSpending.get(t.newClubId) || 0;
          clubSpending.set(t.newClubId, current + Number(t.transferFee));
        }
      });
      
      let topSpendingClub = '';
      let maxSpending = 0;
      for (const [clubId, spending] of clubSpending) {
        if (spending > maxSpending) {
          maxSpending = spending;
          const club = clubs.find(c => c.id === clubId);
          topSpendingClub = club?.name || '';
        }
      }
      
      await prisma.leaguePerformance.create({
        data: {
          leagueId: league.id,
          season: season,
          avgTransferFee: avgFee > 0 ? BigInt(Math.floor(avgFee)) : null,
          totalTransfers: leagueTransfers.length,
          topSpendingClub: topSpendingClub || null,
          uefaRanking: league.tier // Vereinfacht: Tier als Ranking
        }
      });
    }
  }

  // FIXED: Berechne ROI für Transfers mit Follow-up Sales
  console.log('💹 Calculating ROI for transfers...');
  const playersWithMultipleTransfers = new Map<string, any[]>();
  
  // Gruppiere Transfers nach Spieler
  transfers.forEach(transfer => {
    const playerName = transfer.playerName;
    if (!playersWithMultipleTransfers.has(playerName)) {
      playersWithMultipleTransfers.set(playerName, []);
    }
    playersWithMultipleTransfers.get(playerName)!.push(transfer);
  });

  // Berechne ROI für Spieler mit mehreren Transfers
  for (const [playerName, playerTransfers] of playersWithMultipleTransfers) {
    if (playerTransfers.length < 2) continue;
    
    // Sortiere nach Datum
    playerTransfers.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    for (let i = 0; i < playerTransfers.length - 1; i++) {
      const buyTransfer = playerTransfers[i];
      const sellTransfer = playerTransfers[i + 1];
      
      if (buyTransfer.transferFee && sellTransfer.transferFee && 
          sellTransfer.oldClubId === buyTransfer.newClubId &&
          Number(buyTransfer.transferFee) > 0) { // Vermeide Division durch 0
        
        try {
          // ROI berechnen
          const buyPrice = Number(buyTransfer.transferFee);
          const sellPrice = Number(sellTransfer.transferFee);
          const roi = ((sellPrice - buyPrice) / buyPrice) * 100;
          
          // Verhindere extreme ROI-Werte
          const clampedROI = Math.max(-100, Math.min(1000, roi));
          
          // Update Buy-Transfer mit ROI
          await prisma.transfer.update({
            where: { id: buyTransfer.id },
            data: {
              roiPercentage: Math.round(clampedROI * 100) / 100, // Runde auf 2 Dezimalstellen
              wasSuccessful: clampedROI > 0 // Erfolgreich wenn Gewinn gemacht
            }
          });
        } catch (error) {
          console.warn(`⚠️ Could not update ROI for transfer ${buyTransfer.id}:`, error);
        }
      }
    }
  }

  console.log('✅ Enhanced database seeding completed!');
  
  // Statistics
  const stats = {
    leagues: await prisma.league.count(),
    clubs: await prisma.club.count(),
    players: await prisma.player.count(),
    transfers: await prisma.transfer.count(),
    playerTransfers: await prisma.playerTransfer.count(),
    transferSuccess: await prisma.transferSuccess.count(),
    leaguePerformances: await prisma.leaguePerformance.count(),
    loanToBuyTransfers: await prisma.transfer.count({ where: { isLoanToBuy: true } }),
    transfersWithROI: await prisma.transfer.count({ where: { roiPercentage: { not: null } } })
  };
  
  console.log('📈 Database Statistics:');
  console.table(stats);
  
  // Sample data insights
  console.log('\n🔍 Sample Data Insights:');
  
  const topTransfer = await prisma.transfer.findFirst({
    where: { transferFee: { not: null } },
    orderBy: { transferFee: 'desc' },
    include: { newClub: true, oldClub: true }
  });
  
  if (topTransfer) {
    console.log(`💰 Most expensive transfer: ${topTransfer.playerName} from ${topTransfer.oldClub?.name || 'Free Agent'} to ${topTransfer.newClub.name} for €${(Number(topTransfer.transferFee!) / 1000000).toFixed(1)}M`);
  }
  
  const bestROI = await prisma.transfer.findFirst({
    where: { roiPercentage: { not: null } },
    orderBy: { roiPercentage: 'desc' },
    include: { newClub: true }
  });
  
  if (bestROI) {
    console.log(`📈 Best ROI: ${bestROI.playerName} at ${bestROI.newClub.name} with ${bestROI.roiPercentage?.toFixed(1)}% return`);
  }
  
  const transferWindows = await prisma.transfer.groupBy({
    by: ['transferWindow'],
    _count: { transferWindow: true }
  });
  
  console.log('🗓️ Transfer Windows:');
  transferWindows.forEach(window => {
    console.log(`  ${window.transferWindow}: ${window._count.transferWindow} transfers`);
  });
  
  // FIXED: Korrigierte Kontinental-Statistiken ohne $queryRaw
  const continentStats = await prisma.league.findMany({
    include: {
      clubs: {
        include: {
          transfersIn: {
            where: {
              transferFee: { not: null }
            }
          }
        }
      }
    }
  });

  const continentData = continentStats.reduce((acc: any[], league) => {
    const transfersInLeague = league.clubs.flatMap(club => club.transfersIn);
    const totalFees = transfersInLeague.reduce((sum, transfer) => 
      sum + (transfer.transferFee ? Number(transfer.transferFee) : 0), 0
    );
    const avgFee = transfersInLeague.length > 0 ? totalFees / transfersInLeague.length : 0;
    
    const existingContinent = acc.find(item => item.continent === league.continent);
    if (existingContinent) {
      existingContinent.transfer_count += transfersInLeague.length;
      existingContinent.total_fees += totalFees;
    } else {
      acc.push({
        continent: league.continent,
        transfer_count: transfersInLeague.length,
        total_fees: totalFees,
        avg_fee: avgFee
      });
    }
    return acc;
  }, []);

  // Berechne finale Durchschnitte
  continentData.forEach(continent => {
    continent.avg_fee = continent.transfer_count > 0 ? 
      continent.total_fees / continent.transfer_count : 0;
  });

  console.log('🌍 Transfers by Continent:');
  console.table(continentData.map(c => ({
    Continent: c.continent,
    Transfers: c.transfer_count,
    'Avg Fee (€M)': (c.avg_fee / 1000000).toFixed(2)
  })));
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });