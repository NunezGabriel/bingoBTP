const { prisma, isUniqueViolation } = require("../lib/prisma");
const { withTx } = require("../lib/tx");
const { shuffle } = require("../lib/codes");
const { conflict, notFound } = require("../lib/http");
const hub = require("../realtime/hub");
const content = require("../content/bingo");
const { grant, announceGrants } = require("./points");
const { PUBLIC_SELECT, publicPlayer } = require("./players");
const { addContact } = require("./contacts");

const BOARD_SIZE = 9;

const boardInclude = {
  cells: {
    orderBy: { position: "asc" },
    include: { signedBy: { select: PUBLIC_SELECT } },
  },
};

/** 9 preguntas al azar de src/content/bingo.js. */
function randomCells() {
  const prompts = [...new Set(content.prompts.map((p) => p.trim()).filter(Boolean))];
  if (prompts.length < BOARD_SIZE) {
    throw conflict(`El bingo necesita al menos ${BOARD_SIZE} preguntas en src/content/bingo.js`);
  }
  return shuffle(prompts)
    .slice(0, BOARD_SIZE)
    .map((text, position) => ({ position, text }));
}

/**
 * Cartillas para todos los inscritos, dentro de la transaccion que crea el
 * juego. Las casillas se insertan en lotes para no mandar una sola sentencia
 * gigante cuando hay cientos de jugadores.
 */
async function createBoards(tx, sessionId, playerIds) {
  if (!playerIds.length) return 0;
  const boards = await tx.bingoBoard.createManyAndReturn({
    data: playerIds.map((playerId) => ({ sessionId, playerId })),
    select: { id: true },
  });
  const cells = boards.flatMap((b) => randomCells().map((c) => ({ ...c, boardId: b.id })));
  for (let i = 0; i < cells.length; i += 3000) {
    await tx.bingoCell.createMany({ data: cells.slice(i, i + 3000) });
  }
  return boards.length;
}

/** La cartilla del jugador; si se inscribio con el juego ya empezado, se crea al vuelo. */
async function getOrCreateBoard(session, playerId) {
  const where = { sessionId_playerId: { sessionId: session.id, playerId } };
  const existing = await prisma.bingoBoard.findUnique({ where, include: boardInclude });
  if (existing) return existing;

  try {
    return await prisma.bingoBoard.create({
      data: { sessionId: session.id, playerId, cells: { create: randomCells() } },
      include: boardInclude,
    });
  } catch (error) {
    if (isUniqueViolation(error)) return prisma.bingoBoard.findUnique({ where, include: boardInclude });
    throw error;
  }
}

function boardView(board, session) {
  return {
    id: board.id,
    sessionId: session.id,
    completedAt: board.completedAt,
    completedRank: board.completedRank,
    signed: board.cells.filter((c) => c.signedById).length,
    size: BOARD_SIZE,
    cellPoints: session.cellPoints,
    completePoints: session.completePoints,
    podiumBonus: content.podiumBonus,
    cells: board.cells.map((c) => ({
      position: c.position,
      text: c.text,
      signedAt: c.signedAt,
      signedBy: publicPlayer(c.signedBy),
    })),
  };
}

/** Los primeros en completar (una sola consulta: la ve cada celular). */
async function podium(sessionId, limit = content.podiumBonus.length) {
  const boards = await prisma.bingoBoard.findMany({
    where: { sessionId, completedRank: { not: null } },
    orderBy: { completedRank: "asc" },
    take: limit,
    select: { completedRank: true, player: { select: PUBLIC_SELECT } },
  });
  return boards.map((b) => ({ rank: b.completedRank, player: publicPlayer(b.player) }));
}

/** Ganadores en orden de llegada y quienes van mas cerca de completar. */
async function results(sessionId) {
  const [winners, closest, totals] = await Promise.all([
    prisma.bingoBoard.findMany({
      where: { sessionId, completedRank: { not: null } },
      orderBy: { completedRank: "asc" },
      take: 10,
      include: { player: { select: PUBLIC_SELECT } },
    }),
    prisma.$queryRaw`
      SELECT b."playerId", COUNT(c."signedById")::int AS signed
      FROM "BingoBoard" b
      JOIN "BingoCell" c ON c."boardId" = b.id
      WHERE b."sessionId" = ${sessionId} AND b."completedAt" IS NULL
      GROUP BY b."playerId"
      HAVING COUNT(c."signedById") > 0
      ORDER BY signed DESC
      LIMIT 5`,
    prisma.$queryRaw`
      SELECT COUNT(*)::int AS boards,
             COUNT(*) FILTER (WHERE "completedAt" IS NOT NULL)::int AS completed
      FROM "BingoBoard" WHERE "sessionId" = ${sessionId}`,
  ]);

  const closestPlayers = closest.length
    ? await prisma.player.findMany({
        where: { id: { in: closest.map((c) => c.playerId) } },
        select: PUBLIC_SELECT,
      })
    : [];
  const byId = new Map(closestPlayers.map((p) => [p.id, p]));

  return {
    boards: totals[0]?.boards ?? 0,
    completed: totals[0]?.completed ?? 0,
    winners: winners.map((w) => ({ rank: w.completedRank, player: publicPlayer(w.player) })),
    closest: closest.map((c) => ({ signed: c.signed, player: publicPlayer(byId.get(c.playerId)) })),
  };
}

// Progreso del bingo para el admin y la pantalla, agrupado cada ~1.5 s.
let progressSessionId = null;
const broadcastProgress = hub.coalesce(async () => {
  if (!progressSessionId) return;
  const sessionId = progressSessionId;
  hub.publish(["admin", "screen"], "bingo:progress", { sessionId, ...(await results(sessionId)) }, { ephemeral: true });
}, 1500);

/**
 * Firma una casilla con el codigo de otra persona. La misma persona no puede
 * firmar dos casillas de la misma cartilla: obliga a conocer a 9 personas.
 */
async function signCell(event, session, player, position, signer) {
  if (session.status !== "ACTIVE") {
    throw conflict(session.status === "COUNTDOWN" ? "El bingo aun no empieza" : "El bingo ya termino");
  }

  const [ctx] = await prisma.$queryRaw`
    SELECT
      (SELECT id FROM "BingoBoard" WHERE "sessionId" = ${session.id}::int AND "playerId" = ${player.id}::int) AS "boardId",
      EXISTS (SELECT 1 FROM "EventPlayer"
        WHERE "eventId" = ${event.id}::int AND "playerId" = ${signer.id}::int) AS "signerInEvent"`;
  if (!ctx.signerInEvent) {
    throw notFound(`${signer.nickname} no esta inscrito en este evento`);
  }
  const boardId = ctx.boardId ?? (await getOrCreateBoard(session, player.id)).id;

  let outcome;
  try {
    outcome = await withTx(async (tx, onCommit) => {
      // Firma solo si la casilla esta libre y esa persona no firmo otra de esta
      // cartilla. Una sola sentencia: sin ventana entre "validar" y "escribir".
      const signed = await tx.$queryRaw`
        UPDATE "BingoCell" AS c
        SET "signedById" = ${signer.id}::int, "signedAt" = now() AT TIME ZONE 'UTC'
        WHERE c."boardId" = ${boardId}::int AND c.position = ${position}::int
          AND c."signedById" IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM "BingoCell" x
            WHERE x."boardId" = ${boardId}::int AND x."signedById" = ${signer.id}::int
          )
        RETURNING c.id`;

      if (signed.length === 0) {
        const [why] = await tx.$queryRaw`
          SELECT
            EXISTS (SELECT 1 FROM "BingoCell" WHERE "boardId" = ${boardId}::int AND "signedById" = ${signer.id}::int) AS repeated,
            EXISTS (SELECT 1 FROM "BingoCell" WHERE "boardId" = ${boardId}::int AND position = ${position}::int) AS "cellExists"`;
        if (!why.cellExists) throw notFound("Casilla no encontrada");
        if (why.repeated) throw conflict(`${signer.nickname} ya firmo otra casilla de tu cartilla`);
        throw conflict("Esa casilla ya esta firmada");
      }

      const [{ count }] = await tx.$queryRaw`
        SELECT COUNT(*)::int AS count FROM "BingoCell"
        WHERE "boardId" = ${boardId}::int AND "signedById" IS NOT NULL`;

      let rank = null;
      if (count >= BOARD_SIZE) {
        // Bloquea el juego para que dos cartillas completadas a la vez no
        // reciban el mismo puesto.
        await tx.$queryRaw`SELECT id FROM "GameSession" WHERE id = ${session.id}::int FOR UPDATE`;
        const done = await tx.$queryRaw`
          UPDATE "BingoBoard" SET
            "completedAt" = now() AT TIME ZONE 'UTC',
            "completedRank" = (
              SELECT COUNT(*)::int + 1 FROM "BingoBoard"
              WHERE "sessionId" = ${session.id}::int AND "completedAt" IS NOT NULL
            )
          WHERE id = ${boardId}::int AND "completedAt" IS NULL
          RETURNING "completedRank"`;
        rank = done[0]?.completedRank ?? null;
      }

      const entries = [
        {
          playerId: player.id,
          amount: session.cellPoints,
          source: "BINGO",
          refKey: `bingo:${session.id}:cell:${position}`,
          label: "Bingo: casilla firmada",
        },
      ];
      if (rank) {
        const bonus = content.podiumBonus[rank - 1] ?? 0;
        entries.push({
          playerId: player.id,
          amount: session.completePoints + bonus,
          source: "BINGO",
          refKey: `bingo:${session.id}:complete`,
          label: `BINGO completado (puesto ${rank})`,
        });
      }

      const grants = await grant(tx, event.id, entries);
      onCommit(async () => {
        hub.toPlayer(signer.id, "bingo:signed", { for: publicPlayer(player) });
        if (rank) {
          hub.publish(["all", "screen", "admin"], "bingo:completed", {
            sessionId: session.id,
            rank,
            player: publicPlayer(player),
          });
        }
        await announceGrants(event.id, grants);
        progressSessionId = session.id;
        broadcastProgress();
      });

      return { signedCount: count, completedRank: rank };
    });
  } catch (error) {
    // Dos firmas simultaneas del mismo firmante: el indice unico rechaza la segunda.
    if (isUniqueViolation(error) || error?.cause?.code === "23505") {
      throw conflict(`${signer.nickname} ya firmo otra casilla de tu cartilla`);
    }
    throw error;
  }

  // Firmar tambien los agrega como contactos (sin puntos).
  await addContact(event.id, player, signer);

  const fresh = await prisma.bingoBoard.findUnique({ where: { id: boardId }, include: boardInclude });
  return { ...outcome, board: boardView(fresh, session) };
}

module.exports = {
  BOARD_SIZE,
  randomCells,
  createBoards,
  getOrCreateBoard,
  boardView,
  podium,
  results,
  signCell,
};
