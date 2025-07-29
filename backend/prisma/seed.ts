import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding...');

  // Clear existing data
  console.log('🧹 Cleaning existing data...');
  await prisma.transfer.deleteMany({});
  await prisma.club.deleteMany({});
  await prisma.league.deleteMany({});
  
  console.log('✅ Existing data cleared');

  // Create Leagues
  console.log('🏆 Creating leagues...');
  const bundesliga = await prisma.league.create({
    data: {
      name: 'Bundesliga',
      country: 'Germany',
      tier: 1,
      seasonStartMonth: 8
    }
  });

  const premierLeague = await prisma.league.create({
    data: {
      name: 'Premier League',
      country: 'England',
      tier: 1,
      seasonStartMonth: 8
    }
  });

  const laLiga = await prisma.league.create({
    data: {
      name: 'La Liga',
      country: 'Spain',
      tier: 1,
      seasonStartMonth: 8
    }
  });

  const serieA = await prisma.league.create({
    data: {
      name: 'Serie A',
      country: 'Italy',
      tier: 1,
      seasonStartMonth: 8
    }
  });

  const ligue1 = await prisma.league.create({
    data: {
      name: 'Ligue 1',
      country: 'France',
      tier: 1,
      seasonStartMonth: 8
    }
  });

  console.log('✅ Created 5 leagues');

  // Create Clubs
  console.log('⚽ Creating clubs...');
  const clubs = [
    // Bundesliga (Germany)
    { name: 'FC Bayern München', shortName: 'Bayern', leagueId: bundesliga.id, country: 'Germany', clubValue: BigInt(4200000000), foundingYear: 1900, stadiumCapacity: 75000 },
    { name: 'Borussia Dortmund', shortName: 'BVB', leagueId: bundesliga.id, country: 'Germany', clubValue: BigInt(1900000000), foundingYear: 1909, stadiumCapacity: 81365 },
    { name: 'RB Leipzig', shortName: 'Leipzig', leagueId: bundesliga.id, country: 'Germany', clubValue: BigInt(1200000000), foundingYear: 2009, stadiumCapacity: 47069 },
    { name: 'Bayer Leverkusen', shortName: 'Leverkusen', leagueId: bundesliga.id, country: 'Germany', clubValue: BigInt(980000000), foundingYear: 1904, stadiumCapacity: 30210 },
    { name: 'Eintracht Frankfurt', shortName: 'Frankfurt', leagueId: bundesliga.id, country: 'Germany', clubValue: BigInt(650000000), foundingYear: 1899, stadiumCapacity: 51500 },
    { name: 'Borussia Mönchengladbach', shortName: 'Gladbach', leagueId: bundesliga.id, country: 'Germany', clubValue: BigInt(450000000), foundingYear: 1900, stadiumCapacity: 54057 },

    // Premier League (England)
    { name: 'Manchester City', shortName: 'Man City', leagueId: premierLeague.id, country: 'England', clubValue: BigInt(5100000000), foundingYear: 1880, stadiumCapacity: 55017 },
    { name: 'Arsenal FC', shortName: 'Arsenal', leagueId: premierLeague.id, country: 'England', clubValue: BigInt(2800000000), foundingYear: 1886, stadiumCapacity: 60260 },
    { name: 'Liverpool FC', shortName: 'Liverpool', leagueId: premierLeague.id, country: 'England', clubValue: BigInt(4400000000), foundingYear: 1892, stadiumCapacity: 53394 },
    { name: 'Chelsea FC', shortName: 'Chelsea', leagueId: premierLeague.id, country: 'England', clubValue: BigInt(3200000000), foundingYear: 1905, stadiumCapacity: 40834 },
    { name: 'Manchester United', shortName: 'Man Utd', leagueId: premierLeague.id, country: 'England', clubValue: BigInt(6550000000), foundingYear: 1878, stadiumCapacity: 74140 },
    { name: 'Tottenham Hotspur', shortName: 'Spurs', leagueId: premierLeague.id, country: 'England', clubValue: BigInt(2300000000), foundingYear: 1882, stadiumCapacity: 62850 },

    // La Liga (Spain)
    { name: 'Real Madrid', shortName: 'Real', leagueId: laLiga.id, country: 'Spain', clubValue: BigInt(6600000000), foundingYear: 1902, stadiumCapacity: 81044 },
    { name: 'FC Barcelona', shortName: 'Barca', leagueId: laLiga.id, country: 'Spain', clubValue: BigInt(5500000000), foundingYear: 1899, stadiumCapacity: 99354 },
    { name: 'Atlético Madrid', shortName: 'Atlético', leagueId: laLiga.id, country: 'Spain', clubValue: BigInt(1500000000), foundingYear: 1903, stadiumCapacity: 68456 },
    { name: 'Sevilla FC', shortName: 'Sevilla', leagueId: laLiga.id, country: 'Spain', clubValue: BigInt(900000000), foundingYear: 1890, stadiumCapacity: 43883 },
    { name: 'Real Sociedad', shortName: 'Sociedad', leagueId: laLiga.id, country: 'Spain', clubValue: BigInt(600000000), foundingYear: 1909, stadiumCapacity: 39500 },
    { name: 'Valencia CF', shortName: 'Valencia', leagueId: laLiga.id, country: 'Spain', clubValue: BigInt(580000000), foundingYear: 1919, stadiumCapacity: 49430 },

    // Serie A (Italy)
    { name: 'AC Milan', shortName: 'Milan', leagueId: serieA.id, country: 'Italy', clubValue: BigInt(1800000000), foundingYear: 1899, stadiumCapacity: 75923 },
    { name: 'Inter Milan', shortName: 'Inter', leagueId: serieA.id, country: 'Italy', clubValue: BigInt(1900000000), foundingYear: 1908, stadiumCapacity: 75923 },
    { name: 'Juventus FC', shortName: 'Juventus', leagueId: serieA.id, country: 'Italy', clubValue: BigInt(2400000000), foundingYear: 1897, stadiumCapacity: 41507 },
    { name: 'AS Roma', shortName: 'Roma', leagueId: serieA.id, country: 'Italy', clubValue: BigInt(1100000000), foundingYear: 1927, stadiumCapacity: 70634 },
    { name: 'SSC Napoli', shortName: 'Napoli', leagueId: serieA.id, country: 'Italy', clubValue: BigInt(1600000000), foundingYear: 1926, stadiumCapacity: 54726 },
    { name: 'Atalanta BC', shortName: 'Atalanta', leagueId: serieA.id, country: 'Italy', clubValue: BigInt(750000000), foundingYear: 1907, stadiumCapacity: 21300 },

    // Ligue 1 (France)
    { name: 'Paris Saint-Germain', shortName: 'PSG', leagueId: ligue1.id, country: 'France', clubValue: BigInt(4100000000), foundingYear: 1970, stadiumCapacity: 47929 },
    { name: 'Olympique de Marseille', shortName: 'Marseille', leagueId: ligue1.id, country: 'France', clubValue: BigInt(850000000), foundingYear: 1899, stadiumCapacity: 67394 },
    { name: 'Olympique Lyonnais', shortName: 'Lyon', leagueId: ligue1.id, country: 'France', clubValue: BigInt(620000000), foundingYear: 1950, stadiumCapacity: 59186 },
    { name: 'AS Monaco', shortName: 'Monaco', leagueId: ligue1.id, country: 'France', clubValue: BigInt(580000000), foundingYear: 1924, stadiumCapacity: 18523 },
    { name: 'OGC Nice', shortName: 'Nice', leagueId: ligue1.id, country: 'France', clubValue: BigInt(420000000), foundingYear: 1904, stadiumCapacity: 35624 },
    { name: 'Lille OSC', shortName: 'Lille', leagueId: ligue1.id, country: 'France', clubValue: BigInt(380000000), foundingYear: 1944, stadiumCapacity: 50186 }
  ];

  const createdClubs = [];
  for (const club of clubs) {
    try {
      const createdClub = await prisma.club.create({ data: club });
      createdClubs.push(createdClub);
    } catch (error) {
      console.error(`❌ Error creating club ${club.name}:`, error);
      throw error;
    }
  }

  console.log(`✅ Created ${createdClubs.length} clubs`);

  // Enhanced player names with more realistic variety
  const playerNames = [
    // German players
    'Max Müller', 'Leon Weber', 'Felix Schmidt', 'Luca Fischer', 'Noah Meyer', 'Ben Schulz',
    'Paul Wagner', 'Luis Koch', 'Jonas Becker', 'Finn Richter', 'Tim Hoffmann', 'Jan Krüger',
    
    // English players
    'James Smith', 'Harry Johnson', 'Charlie Wilson', 'George Brown', 'Oliver Taylor', 'Jack Davies',
    'William Evans', 'Thomas Moore', 'Joshua White', 'Daniel Harris', 'Samuel Clark', 'Matthew Lewis',
    
    // Spanish players
    'Alejandro García', 'Pablo Martínez', 'Diego López', 'Carlos Rodríguez', 'Miguel Pérez', 'Javier Sánchez',
    'Sergio Gómez', 'Adrián Ruiz', 'Álvaro Hernández', 'Raúl Jiménez', 'Fernando Moreno', 'Manuel Muñoz',
    
    // Italian players
    'Marco Rossi', 'Francesco Russo', 'Alessandro Ferrari', 'Andrea Esposito', 'Matteo Bianchi', 'Luca Romano',
    'Davide Colombo', 'Gabriele Ricci', 'Lorenzo Marino', 'Simone Greco', 'Nicola Costa', 'Filippo Conti',
    
    // French players
    'Lucas Martin', 'Nathan Bernard', 'Hugo Dubois', 'Théo Thomas', 'Maxime Robert', 'Antoine Petit',
    'Julien Durand', 'Alexandre Moreau', 'Baptiste Laurent', 'Romain Simon', 'Nicolas Michel', 'Pierre Leroy',
    
    // International players
    'João Silva', 'Pedro Santos', 'André Oliveira', 'Rafael Costa', 'Bruno Ferreira', 'Gonçalo Pereira',
    'Kylian Dupont', 'Raphaël Girard', 'Mohamed Hassan', 'Youssef Benali', 'Karim Mansouri', 'Omar Ziani',
    'Viktor Petrov', 'Aleksandr Kozlov', 'Dmitri Volkov', 'Nikolai Popov', 'Andrei Smirnov', 'Pavel Fedorov',
    'Erik Andersen', 'Lars Nielsen', 'Mads Hansen', 'Christian Johansen', 'Anders Larsen', 'Michael Olsen'
  ];

  const positions = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];
  const transferTypes = ['sale', 'loan', 'free', 'loan_with_option'];
  const seasons = ['2022/23', '2023/24', '2024/25'];

  // Generate more realistic transfers
  console.log('💰 Creating transfers...');
  const transfers = [];
  
  // Track which players have been transferred to avoid duplicates
  const usedPlayerNames = new Set<string>();
  
  for (let i = 0; i < 800; i++) {
    try {
      // Select clubs for transfer
      const oldClub = createdClubs[Math.floor(Math.random() * createdClubs.length)];
      let newClub = createdClubs[Math.floor(Math.random() * createdClubs.length)];
      
      // Ensure different clubs and avoid same league transfers sometimes for realism
      let attempts = 0;
      while ((newClub.id === oldClub.id || (Math.random() > 0.7 && newClub.leagueId === oldClub.leagueId)) && attempts < 10) {
        newClub = createdClubs[Math.floor(Math.random() * createdClubs.length)];
        attempts++;
      }

      // Generate unique player name
      let playerName = playerNames[Math.floor(Math.random() * playerNames.length)];
      let nameAttempts = 0;
      while (usedPlayerNames.has(playerName) && nameAttempts < 50) {
        playerName = playerNames[Math.floor(Math.random() * playerNames.length)];
        nameAttempts++;
      }
      
      // If we can't find a unique name, modify it
      if (usedPlayerNames.has(playerName)) {
        playerName = `${playerName} ${Math.floor(Math.random() * 100)}`;
      }
      usedPlayerNames.add(playerName);

      const transferType = transferTypes[Math.floor(Math.random() * transferTypes.length)];
      const position = positions[Math.floor(Math.random() * positions.length)];
      const season = seasons[Math.floor(Math.random() * seasons.length)];
      const playerAge = Math.floor(Math.random() * 15) + 18; // 18-32 years
      
      // Generate more realistic transfer fees based on age, position, and league
      let transferFee = null;
      if (transferType === 'sale') {
        let baseFee = 1000000; // 1M base
        
        // Age factor (peak at 24-27)
        if (playerAge >= 24 && playerAge <= 27) {
          baseFee *= 3;
        } else if (playerAge >= 20 && playerAge <= 23) {
          baseFee *= 2;
        } else if (playerAge >= 28 && playerAge <= 30) {
          baseFee *= 1.5;
        }
        
        // Position factor
        if (position === 'Forward') {
          baseFee *= 2;
        } else if (position === 'Midfielder') {
          baseFee *= 1.5;
        } else if (position === 'Defender') {
          baseFee *= 1.2;
        }
        
        // League factor (based on buying club)
        const buyingLeague = createdClubs.find(c => c.id === newClub.id)?.leagueId;
        if (buyingLeague === premierLeague.id) {
          baseFee *= 2;
        } else if (buyingLeague === laLiga.id || buyingLeague === bundesliga.id) {
          baseFee *= 1.5;
        }
        
        // Add randomness
        transferFee = Math.floor(baseFee * (0.5 + Math.random() * 1.5));
        
        // Cap at reasonable maximum
        transferFee = Math.min(transferFee, 150000000);
        
      } else if (transferType === 'loan_with_option') {
        transferFee = Math.floor(Math.random() * 30000000) + 5000000; // 5M to 35M
      }

      // Generate date within season
      const startYear = parseInt(season.split('/')[0]);
      const seasonStart = new Date(startYear, 6, 1); // July 1st
      const seasonEnd = new Date(startYear + 1, 5, 30); // June 30th
      
      // Weight transfers towards transfer windows (July-August, January)
      let randomDate: Date;
      if (Math.random() > 0.3) {
        // Summer window (July-August)
        const summerStart = new Date(startYear, 6, 1); // July 1st
        const summerEnd = new Date(startYear, 7, 31); // August 31st
        randomDate = new Date(summerStart.getTime() + Math.random() * (summerEnd.getTime() - summerStart.getTime()));
      } else {
        // Winter window (January)
        const winterStart = new Date(startYear + 1, 0, 1); // January 1st
        const winterEnd = new Date(startYear + 1, 0, 31); // January 31st
        randomDate = new Date(winterStart.getTime() + Math.random() * (winterEnd.getTime() - winterStart.getTime()));
      }

      // 15% chance of free agent (no old club)
      const oldClubId = Math.random() > 0.15 ? oldClub.id : null;

      const marketValue = transferFee ? 
        BigInt(Math.floor(Number(transferFee) * (0.8 + Math.random() * 0.4))) : 
        BigInt(Math.floor(Math.random() * 20000000) + 1000000);

      const transfer = {
        playerName,
        oldClubId,
        newClubId: newClub.id,
        transferFee: transferFee ? BigInt(transferFee) : null,
        transferType,
        date: randomDate,
        season,
        playerPosition: position,
        playerAgeAtTransfer: playerAge,
        marketValue,
        contractDuration: Math.floor(Math.random() * 4) + 2, // 2-5 years
        agentFee: transferFee ? BigInt(Math.floor(Number(transferFee) * 0.05)) : null, // 5% agent fee
        loanDuration: transferType.includes('loan') ? Math.floor(Math.random() * 12) + 6 : null, // 6-18 months
        hasBuyOption: transferType === 'loan_with_option',
        buyOptionFee: transferType === 'loan_with_option' ? BigInt(Math.floor(Math.random() * 40000000) + 10000000) : null,
        buyObligation: transferType === 'loan_with_option' && Math.random() > 0.7
      };

      transfers.push(transfer);
      
      if (i % 100 === 0) {
        console.log(`📊 Generated ${i} transfers...`);
      }
      
    } catch (error) {
      console.error(`❌ Error generating transfer ${i}:`, error);
    }
  }

  // Insert transfers in batches to avoid memory issues
  console.log('💾 Inserting transfers into database...');
  const batchSize = 50;
  let insertedCount = 0;
  
  for (let i = 0; i < transfers.length; i += batchSize) {
    try {
      const batch = transfers.slice(i, i + batchSize);
      await prisma.transfer.createMany({
        data: batch,
        skipDuplicates: true
      });
      insertedCount += batch.length;
      
      if (i % (batchSize * 5) === 0) {
        console.log(`💾 Inserted ${insertedCount} transfers...`);
      }
    } catch (error) {
      console.error(`❌ Error inserting batch starting at ${i}:`, error);
    }
  }

  console.log(`✅ Successfully created ${insertedCount} transfers`);

  // Verify the data
  const finalCounts = await Promise.all([
    prisma.league.count(),
    prisma.club.count(),
    prisma.transfer.count()
  ]);

  console.log('\n🎉 Seeding completed successfully!');
  console.log('📊 Final database state:');
  console.log(`   - Leagues: ${finalCounts[0]}`);
  console.log(`   - Clubs: ${finalCounts[1]}`);
  console.log(`   - Transfers: ${finalCounts[2]}`);
  
  // Show some sample statistics
  const totalValue = await prisma.transfer.aggregate({
    _sum: { transferFee: true },
    where: { transferFee: { not: null } }
  });

  const topTransfer = await prisma.transfer.findFirst({
    where: { transferFee: { not: null } },
    orderBy: { transferFee: 'desc' },
    include: {
      oldClub: { select: { name: true } },
      newClub: { select: { name: true } }
    }
  });

  console.log(`💰 Total transfer value: €${(Number(totalValue._sum.transferFee || 0) / 1000000).toFixed(0)}M`);
  if (topTransfer) {
    console.log(`🏆 Highest transfer: ${topTransfer.playerName} (€${(Number(topTransfer.transferFee!) / 1000000).toFixed(1)}M)`);
    console.log(`   From: ${topTransfer.oldClub?.name || 'Free Agent'} → To: ${topTransfer.newClub.name}`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('\n❌ Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });