-- Vuelta al bingo puro: se van personajes, niveles, contactos y trofeos.
-- Las partidas pasan a ser rondas (Round) con cartillas (Card) y casillas (Cell).

-- Jugadores: se renombra nickname -> name y se quitan las columnas del personaje.
ALTER TABLE "Player" RENAME COLUMN "nickname" TO "name";
ALTER TABLE "Player" RENAME COLUMN "nicknameKey" TO "nameKey";
ALTER INDEX "Player_nicknameKey_key" RENAME TO "Player_nameKey_key";
DROP INDEX "Player_role_idx";
ALTER TABLE "Player" DROP COLUMN "avatarClass",
DROP COLUMN "avatarHouse",
DROP COLUMN "role",
DROP COLUMN "xp";
DROP TYPE "Role";

-- Puntos: ahora todos vienen del bingo o de un ajuste del admin.
ALTER TABLE "PointLedger" DROP CONSTRAINT "PointLedger_awardedById_fkey";
DROP INDEX "PointLedger_playerId_createdAt_idx";
ALTER TABLE "PointLedger" DROP COLUMN "awardedById",
DROP COLUMN "source";
DROP TYPE "PointSource";

-- Fuera lo que ya no existe.
ALTER TABLE "Connection" DROP CONSTRAINT "Connection_aId_fkey";
ALTER TABLE "Connection" DROP CONSTRAINT "Connection_bId_fkey";
ALTER TABLE "Connection" DROP CONSTRAINT "Connection_eventId_fkey";
ALTER TABLE "Trophy" DROP CONSTRAINT "Trophy_eventId_fkey";
ALTER TABLE "Trophy" DROP CONSTRAINT "Trophy_playerId_fkey";
ALTER TABLE "BingoCell" DROP CONSTRAINT "BingoCell_boardId_fkey";
ALTER TABLE "BingoCell" DROP CONSTRAINT "BingoCell_signedById_fkey";
ALTER TABLE "BingoBoard" DROP CONSTRAINT "BingoBoard_playerId_fkey";
ALTER TABLE "BingoBoard" DROP CONSTRAINT "BingoBoard_sessionId_fkey";
ALTER TABLE "GameSession" DROP CONSTRAINT "GameSession_eventId_fkey";
DROP TABLE "Connection";
DROP TABLE "Trophy";
DROP TABLE "BingoCell";
DROP TABLE "BingoBoard";
DROP TABLE "GameSession";
DROP TYPE "TrophyKind";
DROP TYPE "GameStatus";
DROP TYPE "GameType";

-- Rondas y cartillas.
CREATE TYPE "RoundStatus" AS ENUM ('COUNTDOWN', 'ACTIVE', 'ENDED');

CREATE TABLE "Round" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "status" "RoundStatus" NOT NULL DEFAULT 'COUNTDOWN',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "cellPoints" INTEGER NOT NULL DEFAULT 5,
    "completePoints" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Card" (
    "id" SERIAL NOT NULL,
    "roundId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3),
    "completedRank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Cell" (
    "id" SERIAL NOT NULL,
    "cardId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "signedById" INTEGER,
    "signedAt" TIMESTAMP(3),
    CONSTRAINT "Cell_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Round_eventId_status_idx" ON "Round"("eventId", "status");
CREATE UNIQUE INDEX "Round_eventId_number_key" ON "Round"("eventId", "number");
CREATE INDEX "Card_roundId_completedRank_idx" ON "Card"("roundId", "completedRank");
CREATE UNIQUE INDEX "Card_roundId_playerId_key" ON "Card"("roundId", "playerId");
CREATE UNIQUE INDEX "Cell_cardId_position_key" ON "Cell"("cardId", "position");
CREATE UNIQUE INDEX "Cell_cardId_signedById_key" ON "Cell"("cardId", "signedById");

ALTER TABLE "Round" ADD CONSTRAINT "Round_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Card" ADD CONSTRAINT "Card_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Card" ADD CONSTRAINT "Card_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Cell" ADD CONSTRAINT "Cell_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Cell" ADD CONSTRAINT "Cell_signedById_fkey" FOREIGN KEY ("signedById") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Solo una ronda abierta por evento (lo garantiza la base, no el codigo).
CREATE UNIQUE INDEX "Round_single_open" ON "Round" ("eventId") WHERE "status" <> 'ENDED';
