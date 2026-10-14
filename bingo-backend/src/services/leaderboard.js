const { prisma } = require("../lib/prisma");
const hub = require("../realtime/hub");
const { PUBLIC_SELECT, publicPlayer } = require("./players");

async function topPlayers(eventId, limit = 10) {
  const rows = await prisma.eventPlayer.findMany({
    where: { eventId, points: { gt: 0 } },
    orderBy: [{ points: "desc" }, { lastScoredAt: { sort: "asc", nulls: "last" } }, { id: "asc" }],
    take: limit,
    select: { points: true, player: { select: PUBLIC_SELECT } },
  });
  return rows.map((r, i) => ({ rank: i + 1, points: r.points, player: publicPlayer(r.player) }));
}

/** Posicion del jugador y total de participantes, en una sola consulta. */
async function rankOf(eventId, playerId) {
  const [row] = await prisma.$queryRaw`
    WITH me AS (
      SELECT points, "lastScoredAt" FROM "EventPlayer"
      WHERE "eventId" = ${eventId} AND "playerId" = ${playerId}
    )
    SELECT
      (SELECT COUNT(*)::int FROM "EventPlayer" WHERE "eventId" = ${eventId}) AS total,
      (SELECT points FROM me) AS points,
      (SELECT COUNT(*)::int + 1 FROM "EventPlayer" ep, me
        WHERE ep."eventId" = ${eventId}
          AND (ep.points > me.points
               OR (ep.points = me.points
                   AND ep."lastScoredAt" IS NOT NULL
                   AND (me."lastScoredAt" IS NULL OR ep."lastScoredAt" < me."lastScoredAt")))
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
  hub.publish(["screen", "admin"], "leaderboard", { eventId, top: await topPlayers(eventId, 10) }, { ephemeral: true });
}, 1500);

/** Marca el ranking como cambiado; se difunde agrupado cada ~1.5 s. */
function leaderboardChanged(eventId) {
  pendingEventId = eventId;
  broadcast();
}

module.exports = { topPlayers, rankOf, leaderboardChanged };
