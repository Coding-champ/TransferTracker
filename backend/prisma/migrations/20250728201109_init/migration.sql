-- CreateTable
CREATE TABLE "leagues" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 1,
    "seasonStartMonth" INTEGER NOT NULL DEFAULT 8,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clubs" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "league_id" INTEGER NOT NULL,
    "country" TEXT NOT NULL,
    "logo_url" TEXT,
    "stadium_capacity" INTEGER,
    "founding_year" INTEGER,
    "club_value" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfers" (
    "id" SERIAL NOT NULL,
    "player_name" TEXT NOT NULL,
    "old_club_id" INTEGER,
    "new_club_id" INTEGER NOT NULL,
    "transfer_fee" BIGINT,
    "transfer_type" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "season" TEXT NOT NULL,
    "player_position" TEXT,
    "player_age_at_transfer" INTEGER,
    "market_value" BIGINT,
    "contract_duration" INTEGER,
    "agent_fee" BIGINT,
    "loan_duration" INTEGER,
    "has_buy_option" BOOLEAN NOT NULL DEFAULT false,
    "buy_option_fee" BIGINT,
    "buy_obligation" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_old_club_id_fkey" FOREIGN KEY ("old_club_id") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_new_club_id_fkey" FOREIGN KEY ("new_club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
