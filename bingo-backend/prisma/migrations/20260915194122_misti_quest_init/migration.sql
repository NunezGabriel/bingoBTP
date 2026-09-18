-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PLAYER', 'STAFF', 'ADMIN');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'LIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "PointSource" AS ENUM ('BINGO', 'MISSION', 'MANUAL');

-- CreateEnum
CREATE TYPE "GameType" AS ENUM ('BINGO');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('COUNTDOWN', 'ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "TrophyKind" AS ENUM ('CHAMPION', 'PODIUM', 'TOP10', 'PARTICIPANT');

-- CreateTable
CREATE TABLE "Player" (
    "id" SERIAL NOT NULL,
    "nickname" TEXT NOT NULL,
    "nicknameKey" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "role" "Role" NOT NULL DEFAULT 'PLAYER',
    "avatarClass" TEXT NOT NULL,
    "avatarHouse" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "bannedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventPlayer" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "lastScoredAt" TIMESTAMP(3),
    "finalRank" INTEGER,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointLedger" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "source" "PointSource" NOT NULL,
    "refKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "awardedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSession" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "type" "GameType" NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'COUNTDOWN',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "cellPoints" INTEGER NOT NULL DEFAULT 5,
    "completePoints" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BingoPrompt" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BingoPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BingoBoard" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3),
    "completedRank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BingoBoard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BingoCell" (
    "id" SERIAL NOT NULL,
    "boardId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "promptId" INTEGER NOT NULL,
    "signedById" INTEGER,
    "signedAt" TIMESTAMP(3),

    CONSTRAINT "BingoCell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Connection" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER,
    "aId" INTEGER NOT NULL,
    "bId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "repeatable" BOOLEAN NOT NULL DEFAULT false,
    "special" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionAward" (
    "id" SERIAL NOT NULL,
    "missionId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "awardedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionAward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "eventId" INTEGER NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trophy" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "eventId" INTEGER NOT NULL,
    "kind" "TrophyKind" NOT NULL,
    "rank" INTEGER,
    "points" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trophy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_nicknameKey_key" ON "Player"("nicknameKey");

-- CreateIndex
CREATE UNIQUE INDEX "Player_code_key" ON "Player"("code");

-- CreateIndex
CREATE INDEX "Player_role_idx" ON "Player"("role");

-- CreateIndex
CREATE INDEX "EventPlayer_eventId_points_idx" ON "EventPlayer"("eventId", "points");

-- CreateIndex
CREATE UNIQUE INDEX "EventPlayer_eventId_playerId_key" ON "EventPlayer"("eventId", "playerId");

-- CreateIndex
CREATE INDEX "PointLedger_playerId_createdAt_idx" ON "PointLedger"("playerId", "createdAt");

-- CreateIndex
CREATE INDEX "PointLedger_eventId_createdAt_idx" ON "PointLedger"("eventId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PointLedger_eventId_playerId_refKey_key" ON "PointLedger"("eventId", "playerId", "refKey");

-- CreateIndex
CREATE INDEX "GameSession_eventId_status_idx" ON "GameSession"("eventId", "status");

-- CreateIndex
CREATE INDEX "BingoBoard_sessionId_completedRank_idx" ON "BingoBoard"("sessionId", "completedRank");

-- CreateIndex
CREATE UNIQUE INDEX "BingoBoard_sessionId_playerId_key" ON "BingoBoard"("sessionId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "BingoCell_boardId_position_key" ON "BingoCell"("boardId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "BingoCell_boardId_signedById_key" ON "BingoCell"("boardId", "signedById");

-- CreateIndex
CREATE INDEX "Connection_bId_idx" ON "Connection"("bId");

-- CreateIndex
CREATE UNIQUE INDEX "Connection_aId_bId_key" ON "Connection"("aId", "bId");

-- CreateIndex
CREATE INDEX "Mission_eventId_active_idx" ON "Mission"("eventId", "active");

-- CreateIndex
CREATE INDEX "MissionAward_missionId_playerId_idx" ON "MissionAward"("missionId", "playerId");

-- CreateIndex
CREATE INDEX "TeamMember_teamId_idx" ON "TeamMember"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_eventId_playerId_key" ON "TeamMember"("eventId", "playerId");

-- CreateIndex
CREATE INDEX "Announcement_eventId_createdAt_idx" ON "Announcement"("eventId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Trophy_playerId_eventId_key" ON "Trophy"("playerId", "eventId");

-- AddForeignKey
ALTER TABLE "EventPlayer" ADD CONSTRAINT "EventPlayer_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPlayer" ADD CONSTRAINT "EventPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointLedger" ADD CONSTRAINT "PointLedger_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointLedger" ADD CONSTRAINT "PointLedger_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointLedger" ADD CONSTRAINT "PointLedger_awardedById_fkey" FOREIGN KEY ("awardedById") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BingoBoard" ADD CONSTRAINT "BingoBoard_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BingoBoard" ADD CONSTRAINT "BingoBoard_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BingoCell" ADD CONSTRAINT "BingoCell_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "BingoBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BingoCell" ADD CONSTRAINT "BingoCell_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "BingoPrompt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BingoCell" ADD CONSTRAINT "BingoCell_signedById_fkey" FOREIGN KEY ("signedById") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_aId_fkey" FOREIGN KEY ("aId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_bId_fkey" FOREIGN KEY ("bId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionAward" ADD CONSTRAINT "MissionAward_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionAward" ADD CONSTRAINT "MissionAward_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionAward" ADD CONSTRAINT "MissionAward_awardedById_fkey" FOREIGN KEY ("awardedById") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trophy" ADD CONSTRAINT "Trophy_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trophy" ADD CONSTRAINT "Trophy_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Solo un evento abierto a la vez. Prisma no expresa indices parciales, asi
-- que se agregan a mano: la base rechaza dos eventos en curso simultaneos.
CREATE UNIQUE INDEX "Event_single_live" ON "Event" ("status") WHERE "status" = 'LIVE';

-- Solo un juego en marcha por evento: si dos admins lanzan a la vez, gana uno.
CREATE UNIQUE INDEX "GameSession_single_running" ON "GameSession" ("eventId") WHERE "status" <> 'ENDED';
