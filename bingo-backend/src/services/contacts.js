const { prisma } = require("../lib/prisma");
const hub = require("../realtime/hub");
const { PUBLIC_SELECT, publicPlayer } = require("./players");

/**
 * Contactos: la red de gente que cada jugador conocio. Se crean solos al
 * firmar un bingo y tambien escribiendo el codigo de alguien. No dan puntos:
 * los puntos salen de los juegos y las misiones.
 *
 * El par (aId, bId) se guarda ordenado y es unico para siempre: si se vuelven
 * a encontrar en otro evento, siguen siendo el mismo contacto.
 *
 * @returns {Promise<boolean>} true si el contacto es nuevo.
 */
async function addContact(eventId, player, other, { notify = true } = {}) {
  const [aId, bId] = player.id < other.id ? [player.id, other.id] : [other.id, player.id];
  const created = await prisma.connection.createMany({
    data: [{ eventId: eventId ?? null, aId, bId }],
    skipDuplicates: true,
  });
  const isNew = created.count === 1;
  if (isNew && notify) {
    hub.toPlayer(other.id, "contact", { with: publicPlayer(player) });
  }
  return isNew;
}

async function listContacts(playerId) {
  const rows = await prisma.connection.findMany({
    where: { OR: [{ aId: playerId }, { bId: playerId }] },
    orderBy: { createdAt: "desc" },
    include: {
      a: { select: PUBLIC_SELECT },
      b: { select: PUBLIC_SELECT },
      event: { select: { name: true } },
    },
  });
  return rows.map((c) => ({
    player: publicPlayer(c.aId === playerId ? c.b : c.a),
    eventName: c.event?.name ?? null,
    since: c.createdAt,
  }));
}

module.exports = { addContact, listContacts };
