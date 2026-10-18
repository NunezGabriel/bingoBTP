const { prisma, isUniqueViolation } = require("../lib/prisma");
const { withTx } = require("../lib/tx");
const { shuffle } = require("../lib/codes");
const { conflict, notFound } = require("../lib/http");
const hub = require("../realtime/hub");
const content = require("../content/bingo");
const { grant, announceGrants } = require("./points");
const { PUBLIC_SELECT, publicPlayer } = require("./players");

const CARD_SIZE = 9;

const cardInclude = {
  cells: {
    orderBy: { position: "asc" },
    include: { signedBy: { select: PUBLIC_SELECT } },
  },
};

/** 9 preguntas al azar de src/content/bingo.js. */
function randomCells() {
  const prompts = [...new Set(content.prompts.map((p) => p.trim()).filter(Boolean))];
  if (prompts.length < CARD_SIZE) {
    throw conflict(`El bingo necesita al menos ${CARD_SIZE} preguntas en src/content/bingo.js`);
  }
  return shuffle(prompts)
    .slice(0, CARD_SIZE)
    .map((text, position) => ({ position, text }));
}

/**
 * Reparte cartilla a todos los inscritos dentro de la transaccion que crea la
 * ronda. Las casillas se insertan por lotes para no mandar una sola sentencia
 * gigante cuando hay cientos de jugadores.
 */
async function dealCards(tx, roundId, playerIds) {
  if (!playerIds.length) return 0;
  const cards = await tx.card.createManyAndReturn({
    data: playerIds.map((playerId) => ({ roundId, playerId })),
    select: { id: true },
  });
  const cells = cards.flatMap((c) => randomCells().map((cell) => ({ ...cell, cardId: c.id })));
  for (let i = 0; i < cells.length; i += 3000) {
    await tx.cell.createMany({ data: cells.slice(i, i + 3000) });
  }
  return cards.length;
}

/** La cartilla del jugador; si llego con la ronda empezada, se crea al vuelo. */
async function getOrCreateCard(round, playerId) {
  const where = { roundId_playerId: { roundId: round.id, playerId } };
  const existing = await prisma.card.findUnique({ where, include: cardInclude });
  if (existing) return existing;

  try {
    return await prisma.card.create({
      data: { roundId: round.id, playerId, cells: { create: randomCells() } },
      include: cardInclude,
    });
  } catch (error) {
    if (isUniqueViolation(error)) return prisma.card.findUnique({ where, include: cardInclude });
    throw error;
  }
}

function cardView(card, round) {
  return {
    id: card.id,
    roundId: round.id,
    completedAt: card.completedAt,
    completedRank: card.completedRank,
    signed: card.cells.filter((c) => c.signedById).length,
    size: CARD_SIZE,
    cells: card.cells.map((c) => ({
      position: c.position,
      text: c.text,
      signedAt: c.signedAt,
      signedBy: publicPlayer(c.signedBy),
    })),
  };
}

/** Los primeros en completar la ronda (una sola consulta). */
async function podium(roundId, limit = content.podiumBonus.length) {
  const cards = await prisma.card.findMany({
    where: { roundId, completedRank: { not: null } },
    orderBy: { completedRank: "asc" },
    take: limit,
    select: { completedRank: true, player: { select: PUBLIC_SELECT } },
  });
  return cards.map((c) => ({ rank: c.completedRank, player: publicPlayer(c.player) }));
}

/** Resumen de la ronda: quien completo y quien va mas cerca. */
async function results(roundId) {
  const [winners, closest, totals] = await Promise.all([
    prisma.card.findMany({
      where: { roundId, completedRank: { not: null } },
      orderBy: { completedRank: "asc" },
      take: 10,
      include: { player: { select: PUBLIC_SELECT } },
    }),
    prisma.$queryRaw`
      SELECT c."playerId", COUNT(x."signedById")::int AS signed
      FROM "Card" c
      JOIN "Cell" x ON x."cardId" = c.id
      WHERE c."roundId" = ${roundId} AND c."completedAt" IS NULL
      GROUP BY c."playerId"
      HAVING COUNT(x."signedById") > 0
      ORDER BY signed DESC
      LIMIT 5`,
    prisma.$queryRaw`
      SELECT COUNT(*)::int AS cards,
             COUNT(*) FILTER (WHERE "completedAt" IS NOT NULL)::int AS completed
      FROM "Card" WHERE "roundId" = ${roundId}`,
  ]);

  const closestPlayers = closest.length
    ? await prisma.player.findMany({
        where: { id: { in: closest.map((c) => c.playerId) } },
        select: PUBLIC_SELECT,
      })
    : [];
  const byId = new Map(closestPlayers.map((p) => [p.id, p]));

  return {
    cards: totals[0]?.cards ?? 0,
    completed: totals[0]?.completed ?? 0,
    winners: winners.map((w) => ({ rank: w.completedRank, player: publicPlayer(w.player) })),
    closest: closest.map((c) => ({ signed: c.signed, player: publicPlayer(byId.get(c.playerId)) })),
  };
}

// Avance de la ronda para el admin y la pantalla, agrupado cada ~1.5 s.
let progressRoundId = null;
const broadcastProgress = hub.coalesce(async () => {
  if (!progressRoundId) return;
  const roundId = progressRoundId;
  hub.publish(["admin", "screen"], "bingo:progress", { roundId, ...(await results(roundId)) }, { ephemeral: true });
}, 1500);

/**
 * Firma una casilla con el codigo de otra persona. La misma persona no puede
 * firmar dos casillas de la misma cartilla: obliga a conocer a 9 personas.
 */
async function signCell(event, round, player, position, signer) {
  if (round.status !== "ACTIVE") {
    throw conflict(round.status === "COUNTDOWN" ? "La ronda aun no empieza" : "La ronda ya termino");
  }

  const [ctx] = await prisma.$queryRaw`
    SELECT
      (SELECT id FROM "Card" WHERE "roundId" = ${round.id}::int AND "playerId" = ${player.id}::int) AS "cardId",
      EXISTS (SELECT 1 FROM "EventPlayer"
        WHERE "eventId" = ${event.id}::int AND "playerId" = ${signer.id}::int) AS "signerInEvent"`;
  if (!ctx.signerInEvent) throw notFound(`${signer.name} no esta en este evento`);
  const cardId = ctx.cardId ?? (await getOrCreateCard(round, player.id)).id;

  let outcome;
  try {
    outcome = await withTx(async (tx, onCommit) => {
      // Firma solo si la casilla esta libre y esa persona no firmo otra de esta
      // cartilla. Una sola sentencia: sin ventana entre "validar" y "escribir".
      const signed = await tx.$queryRaw`
        UPDATE "Cell" AS c
        SET "signedById" = ${signer.id}::int, "signedAt" = now() AT TIME ZONE 'UTC'
        WHERE c."cardId" = ${cardId}::int AND c.position = ${position}::int
          AND c."signedById" IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM "Cell" x
            WHERE x."cardId" = ${cardId}::int AND x."signedById" = ${signer.id}::int
          )
        RETURNING c.id`;

      if (signed.length === 0) {
        const [why] = await tx.$queryRaw`
          SELECT
            EXISTS (SELECT 1 FROM "Cell" WHERE "cardId" = ${cardId}::int AND "signedById" = ${signer.id}::int) AS repeated,
            EXISTS (SELECT 1 FROM "Cell" WHERE "cardId" = ${cardId}::int AND position = ${position}::int) AS "cellExists"`;
        if (!why.cellExists) throw notFound("Casilla no encontrada");
        if (why.repeated) throw conflict(`${signer.name} ya firmo otra casilla de tu cartilla`);
        throw conflict("Esa casilla ya esta firmada");
      }

      const [{ count }] = await tx.$queryRaw`
        SELECT COUNT(*)::int AS count FROM "Cell"
        WHERE "cardId" = ${cardId}::int AND "signedById" IS NOT NULL`;

      let rank = null;
      if (count >= CARD_SIZE) {
        // Bloquea la ronda para que dos cartillas completadas a la vez no
        // reciban el mismo puesto.
        await tx.$queryRaw`SELECT id FROM "Round" WHERE id = ${round.id}::int FOR UPDATE`;
        const done = await tx.$queryRaw`
          UPDATE "Card" SET
            "completedAt" = now() AT TIME ZONE 'UTC',
            "completedRank" = (
              SELECT COUNT(*)::int + 1 FROM "Card"
              WHERE "roundId" = ${round.id}::int AND "completedAt" IS NOT NULL
            )
          WHERE id = ${cardId}::int AND "completedAt" IS NULL
          RETURNING "completedRank"`;
        rank = done[0]?.completedRank ?? null;
      }

      const entries = [
        {
          playerId: player.id,
          amount: round.cellPoints,
          refKey: `r${round.id}:cell:${position}`,
          label: "Casilla firmada",
        },
      ];
      if (rank) {
        const bonus = content.podiumBonus[rank - 1] ?? 0;
        entries.push({
          playerId: player.id,
          amount: round.completePoints + bonus,
          refKey: `r${round.id}:bingo`,
          label: `BINGO completo (puesto ${rank})`,
        });
      }

      const grants = await grant(tx, event.id, entries);
      onCommit(() => {
        hub.toPlayer(signer.id, "bingo:signed", { for: publicPlayer(player) });
        if (rank) {
          hub.publish(["all", "screen", "admin"], "bingo:completed", {
            roundId: round.id,
            rank,
            player: publicPlayer(player),
          });
        }
        announceGrants(event.id, grants);
        progressRoundId = round.id;
        broadcastProgress();
      });

      return { signedCount: count, completedRank: rank };
    });
  } catch (error) {
    // Dos firmas simultaneas del mismo firmante: el indice unico rechaza la segunda.
    if (isUniqueViolation(error) || error?.cause?.code === "23505") {
      throw conflict(`${signer.name} ya firmo otra casilla de tu cartilla`);
    }
    throw error;
  }

  const fresh = await prisma.card.findUnique({ where: { id: cardId }, include: cardInclude });
  return { ...outcome, card: cardView(fresh, round) };
}

module.exports = {
  CARD_SIZE,
  randomCells,
  dealCards,
  getOrCreateCard,
  cardView,
  podium,
  results,
  signCell,
};
