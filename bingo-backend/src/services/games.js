const { prisma, isUniqueViolation } = require("../lib/prisma");
const { withTx } = require("../lib/tx");
const { conflict, notFound } = require("../lib/http");
const hub = require("../realtime/hub");
const bingoContent = require("../content/bingo");
const bingo = require("./bingo");

/**
 * Juegos lanzados por el admin. Por ahora solo BINGO; cada juego nuevo se
 * programa como otro GameType con su propia logica.
 *
 * Flujo: el admin lanza -> todos los inscritos ven 5,4,3,2,1 -> ACTIVO ->
 * el admin lo termina.
 */
const COUNTDOWN_MS = 5000;
const timers = new Map();

function sessionView(session) {
  return {
    id: session.id,
    type: session.type,
    status: session.status,
    startsAt: session.startsAt,
    endedAt: session.endedAt,
    cellPoints: session.cellPoints,
    completePoints: session.completePoints,
    podiumBonus: bingoContent.podiumBonus,
    serverNow: Date.now(),
  };
}

async function activate(sessionId) {
  clearTimeout(timers.get(sessionId));
  timers.delete(sessionId);
  const updated = await prisma.gameSession.updateMany({
    where: { id: sessionId, status: "COUNTDOWN" },
    data: { status: "ACTIVE" },
  });
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (updated.count === 1 && session) {
    hub.publish(["all", "screen", "admin"], "game:started", sessionView(session));
  }
  return session;
}

function scheduleActivation(session) {
  clearTimeout(timers.get(session.id));
  const delay = Math.max(0, session.startsAt.getTime() - Date.now());
  const timer = setTimeout(() => {
    activate(session.id).catch((error) => console.error("games: no se pudo activar:", error.message));
  }, delay);
  timer.unref?.();
  timers.set(session.id, timer);
}

/** El juego en marcha del evento (cuenta regresiva o activo), o null. */
async function runningSession(eventId) {
  const session = await prisma.gameSession.findFirst({
    where: { eventId, status: { in: ["COUNTDOWN", "ACTIVE"] } },
    orderBy: { id: "desc" },
  });
  // Si el servidor se reinicio durante la cuenta regresiva, se activa al consultar.
  if (session?.status === "COUNTDOWN" && session.startsAt.getTime() <= Date.now()) {
    return activate(session.id);
  }
  return session;
}

async function startBingo(event) {
  bingo.randomCells(); // valida el contenido antes de tocar la base
  if (await runningSession(event.id)) {
    throw conflict("Ya hay un juego en curso. Terminalo antes de lanzar otro");
  }

  // Solo los jugadores inscritos en ESTE evento reciben cartilla.
  const enrolled = await prisma.eventPlayer.findMany({
    where: { eventId: event.id, player: { role: "PLAYER" } },
    select: { playerId: true },
  });

  let session;
  let boards = 0;
  try {
    const result = await withTx(
      async (tx) => {
        const draft = await tx.gameSession.create({
          data: {
            eventId: event.id,
            type: "BINGO",
            startsAt: new Date(Date.now() + COUNTDOWN_MS),
            cellPoints: bingoContent.cellPoints,
            completePoints: bingoContent.completePoints,
          },
        });
        const count = await bingo.createBoards(
          tx,
          draft.id,
          enrolled.map((e) => e.playerId),
        );
        // La cuenta corre desde que las cartillas estan listas: con cientos de
        // jugadores repartirlas toma un momento y nadie debe ver 5,4,3 recortado.
        const created = await tx.gameSession.update({
          where: { id: draft.id },
          data: { startsAt: new Date(Date.now() + COUNTDOWN_MS) },
        });
        return { created, count };
      },
      { timeout: 60_000 },
    );
    session = result.created;
    boards = result.count;
  } catch (error) {
    // Indice parcial: dos admins lanzando a la vez, solo uno gana.
    if (isUniqueViolation(error)) throw conflict("Ya hay un juego en curso");
    throw error;
  }

  scheduleActivation(session);
  hub.publish(["all", "screen", "admin"], "game:countdown", sessionView(session));
  return { session: sessionView(session), boards };
}

async function endGame(eventId, sessionId) {
  clearTimeout(timers.get(sessionId));
  timers.delete(sessionId);
  const updated = await prisma.gameSession.updateMany({
    where: { id: sessionId, eventId, status: { in: ["COUNTDOWN", "ACTIVE"] } },
    data: { status: "ENDED", endedAt: new Date() },
  });
  if (updated.count === 0) throw conflict("Ese juego ya termino");

  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  const summary = await bingo.results(sessionId);
  hub.publish(["all", "screen", "admin"], "game:ended", { ...sessionView(session), results: summary });
  return { session: sessionView(session), results: summary };
}

/** Termina cualquier juego abierto (al cerrar el evento). */
async function endAllRunning(eventId) {
  const running = await prisma.gameSession.findMany({
    where: { eventId, status: { in: ["COUNTDOWN", "ACTIVE"] } },
    select: { id: true },
  });
  for (const { id } of running) {
    await endGame(eventId, id).catch(() => {});
  }
}

/** El ultimo juego terminado del evento, con sus ganadores. */
async function lastEnded(eventId) {
  const session = await prisma.gameSession.findFirst({
    where: { eventId, status: "ENDED" },
    orderBy: { id: "desc" },
  });
  if (!session) return null;
  return { session: sessionView(session), results: await bingo.results(session.id) };
}

async function getSession(sessionId) {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session) throw notFound("Juego no encontrado");
  return session;
}

/** Tras un reinicio: reprograma las cuentas regresivas pendientes. */
async function recoverGames() {
  const pending = await prisma.gameSession.findMany({ where: { status: "COUNTDOWN" } });
  for (const session of pending) scheduleActivation(session);
  return pending.length;
}

module.exports = {
  COUNTDOWN_MS,
  sessionView,
  runningSession,
  startBingo,
  endGame,
  endAllRunning,
  lastEnded,
  getSession,
  recoverGames,
};
