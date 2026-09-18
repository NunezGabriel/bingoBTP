const { prisma, Prisma } = require("../lib/prisma");
const { withTx } = require("../lib/tx");
const { conflict, notFound } = require("../lib/http");
const hub = require("../realtime/hub");
const { invalidateEvent, eventView } = require("./events");
const { leaderboardChanged } = require("./leaderboard");
const { endAllRunning } = require("./games");

/**
 * Abre el evento: desde ahora quien se registre (o entre con su cuenta) queda
 * inscrito en el. Solo puede haber uno abierto.
 */
async function open(eventId) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw notFound("Evento no encontrado");
  if (event.status === "CLOSED") throw conflict("Ese evento ya se cerro; crea uno nuevo");

  const live = await prisma.event.findFirst({
    where: { status: "LIVE", id: { not: eventId } },
    select: { name: true },
  });
  if (live) throw conflict(`"${live.name}" sigue abierto. Cierralo antes de abrir otro`);

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: { status: "LIVE", startedAt: event.startedAt ?? new Date() },
  });
  invalidateEvent();
  hub.publish("all", "event:update", eventView(updated));
  return updated;
}

/**
 * Cierra el evento: termina el juego en curso, congela el ranking, guarda la
 * posicion final de cada jugador y entrega trofeos para siempre.
 */
async function close(eventId) {
  await endAllRunning(eventId);

  return withTx(
    async (tx, onCommit) => {
      const updated = await tx.event.updateMany({
        where: { id: eventId, status: "LIVE" },
        data: { status: "CLOSED", closedAt: new Date() },
      });
      if (updated.count === 0) throw conflict("Solo se puede cerrar un evento abierto");

      const standings = await tx.eventPlayer.findMany({
        where: { eventId, points: { gt: 0 }, player: { role: "PLAYER" } },
        orderBy: [
          { points: "desc" },
          { lastScoredAt: { sort: "asc", nulls: "last" } },
          { id: "asc" },
        ],
        select: { id: true, playerId: true, points: true },
      });

      if (standings.length) {
        const values = standings.map((s, i) => Prisma.sql`(${s.id}::int, ${i + 1}::int)`);
        await tx.$executeRaw`
          UPDATE "EventPlayer" AS ep SET "finalRank" = v.rank
          FROM (VALUES ${Prisma.join(values)}) AS v(id, rank)
          WHERE ep.id = v.id`;

        await tx.trophy.createMany({
          data: standings.map((s, i) => {
            const rank = i + 1;
            return {
              playerId: s.playerId,
              eventId,
              rank,
              points: s.points,
              kind: rank === 1 ? "CHAMPION" : rank <= 3 ? "PODIUM" : rank <= 10 ? "TOP10" : "PARTICIPANT",
            };
          }),
          skipDuplicates: true,
        });
      }

      const event = await tx.event.findUnique({ where: { id: eventId } });
      onCommit(() => {
        invalidateEvent();
        hub.publish("all", "event:update", eventView(event));
        leaderboardChanged(eventId);
      });

      return { ranked: standings.length };
    },
    { timeout: 60_000 },
  );
}

module.exports = { open, close };
