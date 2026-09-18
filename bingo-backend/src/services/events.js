const { prisma } = require("../lib/prisma");

// Solo hay un evento LIVE a la vez y casi todas las peticiones lo consultan.
let cached = { at: 0, event: undefined };
let inflight = null;
const TTL_MS = 5_000;

async function getLiveEvent() {
  if (cached.event !== undefined && Date.now() - cached.at < TTL_MS) {
    return cached.event;
  }
  if (inflight) return inflight;
  inflight = prisma.event
    .findFirst({ where: { status: "LIVE" }, orderBy: { startedAt: "desc" } })
    .then((event) => {
      cached = { at: Date.now(), event };
      return event;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

function invalidateEvent() {
  cached = { at: 0, event: undefined };
}

const joined = new Set();

/** Inscribe al jugador en el evento (idempotente, cacheado en memoria). */
async function ensureJoined(eventId, playerId) {
  const key = `${eventId}:${playerId}`;
  if (joined.has(key)) return;
  await prisma.eventPlayer.createMany({
    data: [{ eventId, playerId }],
    skipDuplicates: true,
  });
  joined.add(key);
}

function forgetJoined(playerId) {
  for (const key of joined) {
    if (key.endsWith(`:${playerId}`)) joined.delete(key);
  }
}

function eventView(event) {
  if (!event) return null;
  return {
    id: event.id,
    name: event.name,
    status: event.status,
    startedAt: event.startedAt,
    closedAt: event.closedAt,
  };
}

/** Jugadores inscritos en el evento (sin staff ni admins). */
function countPlayers(eventId) {
  return prisma.eventPlayer.count({
    where: { eventId, player: { role: "PLAYER" } },
  });
}

/** Cuantos inscritos tiene cada casa en el evento (para armar equipos parejos). */
async function houseCounts(eventId) {
  const rows = await prisma.$queryRaw`
    SELECT p."avatarHouse" AS house, COUNT(*)::int AS players
    FROM "EventPlayer" ep
    JOIN "Player" p ON p.id = ep."playerId"
    WHERE ep."eventId" = ${eventId} AND p.role = 'PLAYER'
    GROUP BY p."avatarHouse"`;
  const byHouse = Object.fromEntries(rows.map((r) => [r.house, r.players]));
  return ["azul", "rojo", "amarillo", "verde"].map((house) => ({
    house,
    players: byHouse[house] ?? 0,
  }));
}

module.exports = {
  getLiveEvent,
  invalidateEvent,
  ensureJoined,
  forgetJoined,
  eventView,
  countPlayers,
  houseCounts,
};
