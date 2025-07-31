/*
  Warnings:

  - You are about to drop the column `club_value` on the `clubs` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `clubs` table. All the data in the column will be lost.
  - You are about to drop the column `founding_year` on the `clubs` table. All the data in the column will be lost.
  - You are about to drop the column `league_id` on the `clubs` table. All the data in the column will be lost.
  - You are about to drop the column `logo_url` on the `clubs` table. All the data in the column will be lost.
  - You are about to drop the column `short_name` on the `clubs` table. All the data in the column will be lost.
  - You are about to drop the column `stadium_capacity` on the `clubs` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `leagues` table. All the data in the column will be lost.
  - You are about to drop the column `agent_fee` on the `transfers` table. All the data in the column will be lost.
  - You are about to drop the column `buy_obligation` on the `transfers` table. All the data in the column will be lost.
  - You are about to drop the column `buy_option_fee` on the `transfers` table. All the data in the column will be lost.
  - You are about to drop the column `contract_duration` on the `transfers` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `transfers` table. All the data in the column will be lost.
  - You are about to drop the column `has_buy_option` on the `transfers` table. All the data in the column will be lost.
  - You are about to drop the column `loan_duration` on the `transfers` table. All the data in the column will be lost.
  - You are about to drop the column `market_value` on the `transfers` table. All the data in the column will be lost.
  - You are about to drop the column `new_club_id` on the `transfers` table. All the data in the column will be lost.
  - You are about to drop the column `old_club_id` on the `transfers` table. All the data in the column will be lost.
  - You are about to drop the column `player_age_at_transfer` on the `transfers` table. All the data in the column will be lost.
  - You are about to drop the column `player_name` on the `transfers` table. All the data in the column will be lost.
  - You are about to drop the column `player_position` on the `transfers` table. All the data in the column will be lost.
  - You are about to drop the column `transfer_fee` on the `transfers` table. All the data in the column will be lost.
  - You are about to drop the column `transfer_type` on the `transfers` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `leagues` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `leagueId` to the `clubs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `clubs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `continent` to the `leagues` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `leagues` table without a default value. This is not possible if the table is not empty.
  - Added the required column `newClubId` to the `transfers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `playerName` to the `transfers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `transferType` to the `transfers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `transferWindow` to the `transfers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `transfers` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "clubs" DROP CONSTRAINT "clubs_league_id_fkey";

-- DropForeignKey
ALTER TABLE "transfers" DROP CONSTRAINT "transfers_new_club_id_fkey";

-- DropForeignKey
ALTER TABLE "transfers" DROP CONSTRAINT "transfers_old_club_id_fkey";

-- AlterTable
ALTER TABLE "clubs" DROP COLUMN "club_value",
DROP COLUMN "created_at",
DROP COLUMN "founding_year",
DROP COLUMN "league_id",
DROP COLUMN "logo_url",
DROP COLUMN "short_name",
DROP COLUMN "stadium_capacity",
ADD COLUMN     "city" TEXT,
ADD COLUMN     "clubValue" BIGINT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "foundingYear" INTEGER,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "leagueId" INTEGER NOT NULL,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "shortName" TEXT,
ADD COLUMN     "stadiumCapacity" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "leagues" DROP COLUMN "created_at",
ADD COLUMN     "continent" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "uefaCoefficient" DOUBLE PRECISION,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "transfers" DROP COLUMN "agent_fee",
DROP COLUMN "buy_obligation",
DROP COLUMN "buy_option_fee",
DROP COLUMN "contract_duration",
DROP COLUMN "created_at",
DROP COLUMN "has_buy_option",
DROP COLUMN "loan_duration",
DROP COLUMN "market_value",
DROP COLUMN "new_club_id",
DROP COLUMN "old_club_id",
DROP COLUMN "player_age_at_transfer",
DROP COLUMN "player_name",
DROP COLUMN "player_position",
DROP COLUMN "transfer_fee",
DROP COLUMN "transfer_type",
ADD COLUMN     "contractDuration" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "isLoanToBuy" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marketValueAtTransfer" BIGINT,
ADD COLUMN     "newClubId" INTEGER NOT NULL,
ADD COLUMN     "oldClubId" INTEGER,
ADD COLUMN     "originalLoanId" INTEGER,
ADD COLUMN     "playerAgeAtTransfer" INTEGER,
ADD COLUMN     "playerName" TEXT NOT NULL,
ADD COLUMN     "playerNationality" TEXT,
ADD COLUMN     "playerPosition" TEXT,
ADD COLUMN     "roiPercentage" DOUBLE PRECISION,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "transferFee" BIGINT,
ADD COLUMN     "transferType" TEXT NOT NULL,
ADD COLUMN     "transferWindow" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "wasSuccessful" BOOLEAN;

-- CreateTable
CREATE TABLE "player" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "position" TEXT,
    "currentClubId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playerTransfer" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "transferId" INTEGER NOT NULL,
    "gamesPlayed" INTEGER,
    "goalsScored" INTEGER,
    "marketValueEnd" BIGINT,
    "wasRegularStarter" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "playerTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaguePerformance" (
    "id" SERIAL NOT NULL,
    "leagueId" INTEGER NOT NULL,
    "season" TEXT NOT NULL,
    "avgTransferFee" BIGINT,
    "totalTransfers" INTEGER NOT NULL DEFAULT 0,
    "topSpendingClub" TEXT,
    "uefaRanking" INTEGER,

    CONSTRAINT "leaguePerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transferSuccess" (
    "id" SERIAL NOT NULL,
    "transferId" INTEGER NOT NULL,
    "performanceRating" DOUBLE PRECISION,
    "marketValueGrowth" BIGINT,
    "contractExtensions" INTEGER NOT NULL DEFAULT 0,
    "trophiesWon" INTEGER NOT NULL DEFAULT 0,
    "evaluatedAfterYears" INTEGER,
    "lastEvaluated" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transferSuccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "playerTransfer_transferId_key" ON "playerTransfer"("transferId");

-- CreateIndex
CREATE UNIQUE INDEX "leaguePerformance_leagueId_season_key" ON "leaguePerformance"("leagueId", "season");

-- CreateIndex
CREATE UNIQUE INDEX "transferSuccess_transferId_key" ON "transferSuccess"("transferId");

-- CreateIndex
CREATE UNIQUE INDEX "leagues_name_key" ON "leagues"("name");

-- AddForeignKey
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_originalLoanId_fkey" FOREIGN KEY ("originalLoanId") REFERENCES "transfers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_oldClubId_fkey" FOREIGN KEY ("oldClubId") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_newClubId_fkey" FOREIGN KEY ("newClubId") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player" ADD CONSTRAINT "player_currentClubId_fkey" FOREIGN KEY ("currentClubId") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playerTransfer" ADD CONSTRAINT "playerTransfer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playerTransfer" ADD CONSTRAINT "playerTransfer_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "transfers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaguePerformance" ADD CONSTRAINT "leaguePerformance_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferSuccess" ADD CONSTRAINT "transferSuccess_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "transfers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
