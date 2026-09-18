-- Las preguntas del bingo y las misiones pasan a definirse en codigo
-- (src/content/). Se quitan equipos, anuncios y suspensiones.

-- Cada casilla guarda su pregunta. Si ya habia cartillas, se copia el texto
-- antes de borrar la tabla de preguntas.
ALTER TABLE "BingoCell" ADD COLUMN "text" TEXT;
UPDATE "BingoCell" AS c SET "text" = p."text" FROM "BingoPrompt" AS p WHERE p."id" = c."promptId";
UPDATE "BingoCell" SET "text" = '' WHERE "text" IS NULL;
ALTER TABLE "BingoCell" ALTER COLUMN "text" SET NOT NULL;
ALTER TABLE "BingoCell" DROP CONSTRAINT "BingoCell_promptId_fkey";
ALTER TABLE "BingoCell" DROP COLUMN "promptId";
DROP TABLE "BingoPrompt";

-- Misiones: los puntos ya entregados quedan en el libro contable (PointLedger).
ALTER TABLE "MissionAward" DROP CONSTRAINT "MissionAward_awardedById_fkey";
ALTER TABLE "MissionAward" DROP CONSTRAINT "MissionAward_missionId_fkey";
ALTER TABLE "MissionAward" DROP CONSTRAINT "MissionAward_playerId_fkey";
ALTER TABLE "Mission" DROP CONSTRAINT "Mission_eventId_fkey";
DROP TABLE "MissionAward";
DROP TABLE "Mission";

-- Equipos y anuncios.
ALTER TABLE "TeamMember" DROP CONSTRAINT "TeamMember_playerId_fkey";
ALTER TABLE "TeamMember" DROP CONSTRAINT "TeamMember_teamId_fkey";
ALTER TABLE "Team" DROP CONSTRAINT "Team_eventId_fkey";
ALTER TABLE "Announcement" DROP CONSTRAINT "Announcement_eventId_fkey";
DROP TABLE "TeamMember";
DROP TABLE "Team";
DROP TABLE "Announcement";

-- Suspensiones y "visto por ultima vez".
ALTER TABLE "Player" DROP COLUMN "bannedAt",
DROP COLUMN "lastSeenAt";
