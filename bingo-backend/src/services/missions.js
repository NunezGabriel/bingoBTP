const crypto = require("node:crypto");
const { prisma } = require("../lib/prisma");
const { withTx } = require("../lib/tx");
const { conflict, notFound } = require("../lib/http");
const MISSIONS = require("../content/missions");
const { grant, announceGrants } = require("./points");

// La lista se valida al arrancar: un error aqui es un error al editar el archivo.
const seen = new Set();
for (const m of MISSIONS) {
  if (!m.key || seen.has(m.key) || m.key.includes(":")) {
    throw new Error(`src/content/missions.js: la mision "${m.key}" esta repetida, sin key o tiene ":"`);
  }
  if (!Number.isInteger(m.points) || m.points <= 0) {
    throw new Error(`src/content/missions.js: "${m.key}" necesita puntos enteros mayores a 0`);
  }
  seen.add(m.key);
}

/**
 * Misiones del evento para un jugador y cuantas veces ya la recibio. Se cuenta
 * en el libro de puntos: cada entrega es una fila "mission:<key>...".
 */
async function missionsForPlayer(eventId, playerId) {
  const rows = await prisma.pointLedger.findMany({
    where: { eventId, playerId, source: "MISSION" },
    select: { refKey: true },
  });
  const counts = new Map();
  for (const { refKey } of rows) {
    const key = refKey.split(":")[1];
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return MISSIONS.map((m) => ({
    key: m.key,
    title: m.title,
    points: m.points,
    repeatable: Boolean(m.repeatable),
    timesAwarded: counts.get(m.key) ?? 0,
  }));
}

async function awardMission(event, key, player, awardedBy) {
  const mission = MISSIONS.find((m) => m.key === key);
  if (!mission) throw notFound("Mision no encontrada");

  // Las unicas usan siempre la misma clave: el indice unico impide darla dos veces.
  const refKey = mission.repeatable ? `mission:${key}:${crypto.randomUUID()}` : `mission:${key}`;

  const grants = await withTx(async (tx, onCommit) => {
    const result = await grant(tx, event.id, [
      {
        playerId: player.id,
        amount: mission.points,
        source: "MISSION",
        refKey,
        label: mission.title,
        awardedById: awardedBy.id,
      },
    ]);
    if (!result.length) throw conflict(`${player.nickname} ya recibio esta mision`);
    onCommit(() => announceGrants(event.id, result));
    return result;
  });

  return {
    mission: { key, title: mission.title, points: mission.points },
    points: grants[0].points,
  };
}

module.exports = { missionsForPlayer, awardMission };
