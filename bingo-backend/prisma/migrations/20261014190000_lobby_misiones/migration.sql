-- Roles, personajes del lobby y la tarjeta de misiones.
--
-- El admin deja de ser una cookie suelta y pasa a ser una cuenta con rol: la
-- app decide que ve cada quien al entrar. El PIN pasa a llamarse clave porque
-- el admin usa una larga, no cuatro digitos.

CREATE TYPE "Role" AS ENUM ('PLAYER', 'ADMIN');

ALTER TABLE "Player" RENAME COLUMN "pinHash" TO "claveHash";
ALTER TABLE "Player" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'PLAYER',
                     ADD COLUMN "skin" TEXT;

CREATE TABLE "MissionClaim" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "missionId" TEXT NOT NULL,
    "validatedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionClaim_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MissionClaim_eventId_playerId_missionId_key"
    ON "MissionClaim"("eventId", "playerId", "missionId");
CREATE INDEX "MissionClaim_eventId_createdAt_idx" ON "MissionClaim"("eventId", "createdAt");

ALTER TABLE "MissionClaim" ADD CONSTRAINT "MissionClaim_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MissionClaim" ADD CONSTRAINT "MissionClaim_playerId_fkey"
    FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MissionClaim" ADD CONSTRAINT "MissionClaim_validatedById_fkey"
    FOREIGN KEY ("validatedById") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
