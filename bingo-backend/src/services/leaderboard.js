const { prisma } = require("../lib/prisma");
const hub = require("../realtime/hub");
const { PUBLIC_SELECT, publicPlayer } = require("./players");

/** Solo compiten los jugadores: staff y admin no se llevan premios. */
const COMPETITOR = { role: "PLAYER" };

async function topPlayers(eventId, limit = 10) {
  const rows = await prisma.eventPlayer.findMany({
    where: { eventId, points: { gt: 0 }, player: COMPETITOR },
    orderBy: [
      { points: "desc" },
      { lastScoredAt: { sort: "asc", nulls: "last" } },
      { id: "asc" },
    ],
    take: limit,
    select: { points: true, player: { select: PUBLIC_SELECT } },
  });
  return rows.map((r, i) => ({
    rank: i + 1,
    points: r.points,
    player: publicPlayer(r.player),
  }));
}

async function houseStandings(eventId) {
  const rows = await prisma.$queryRaw`
    SELECT p."avatarHouse" AS house,
           COALESCE(SUM(ep.points), 0)::int AS points,
           COUNT(*)::int AS players
    FROM "EventPlayer" ep
    JOIN "Player" p ON p.id = ep."playerId"
    WHERE ep."eventId" = ${eventId} AND p.role = 'PLAYER'
    GROUP BY p."avatarHouse"`;
  const byHouse = Object.fromEntries(rows.map((r) => [r.house, r]));
  return ["azul", "rojo", "amarillo", "verde"]
    .map((house) => ({
      house,
      points: byHouse[house]?.points ?? 0,
      players: byHouse[house]?.players ?? 0,
    }))
    .sort((a, b) => b.points - a.points);
}

/** Posicion del jugador y total de competidores, en una sola consulta. */
async function rankOf(eventId, playerId) {
  const [row] = await prisma.$queryRaw`
    WITH me AS (
      SELECT points, "lastScoredAt" FROM "EventPlayer"
      WHERE "eventId" = ${eventId} AND "playerId" = ${playerId}
    ),
    competitors AS (
      SELECT ep.points, ep."lastScoredAt"
      FROM "EventPlayer" ep
      JOIN "Player" p ON p.id = ep."playerId"
      WHERE ep."eventId" = ${eventId} AND p.role = 'PLAYER'
    )
    SELECT
      (SELECT COUNT(*)::int FROM competitors) AS total,
      (SELECT points FROM me) AS points,
      (SELECT COUNT(*)::int + 1 FROM competitors c, me
        WHERE c.points > me.points
           OR (c.points = me.points
               AND c."lastScoredAt" IS NOT NULL
               AND (me."lastScoredAt" IS NULL OR c."lastScoredAt" < me."lastScoredAt"))
      ) AS rank`;
  return {
    total: row?.total ?? 0,
    points: row?.points ?? 0,
    rank: row?.points === null || row?.points === undefined ? null : row.rank,
  };
}

let pendingEventId = null;
const broadcast = hub.coalesce(async () => {
  if (!pendingEventId) return;
  const eventId = pendingEventId;
  const [top, houses] = await Promise.all([topPlayers(eventId, 10), houseStandings(eventId)]);
  hub.publish(["screen", "admin"], "leaderboard", { eventId, top, houses }, { ephemeral: true });
}, 1500);

/** Marca el ranking como cambiado; se difunde agrupado cada ~1.5 s. */
function leaderboardChanged(eventId) {
  pendingEventId = eventId;
  broadcast();
}

module.exports = {
  topPlayers,
  houseStandings,
  rankOf,
  leaderboardChanged,
};
