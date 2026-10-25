const { prisma, isUniqueViolation } = require("../lib/prisma");
const { withTx } = require("../lib/tx");
const { conflict } = require("../lib/http");
const { newRoundCode } = require("../lib/codes");
const hub = require("../realtime/hub");
const content = require("../content/bingo");
const cards = require("./cards");

/**
 * Rondas de bingo.
 *
 * Crear una ronda ya no reparte cartillas a todo el mundo: reparte el codigo.
 * El admin lo proyecta en el auditorio donde toca la dinamica y solo entra
 * quien lo escribe. Asi se puede jugar primero en una sala y despues en la
 * otra, con la misma app y sin que los de la otra sala se enteren.
 *
 * La cartilla se crea al entrar, de modo que tener cartilla ES el registro de
 * "entre a esta ronda": no hace falta otra tabla.
 */
const COUNTDOWN_MS = 5000;
const timers = new Map();

function roundView(round) {
  if (!round) return null;
  return {
    id: round.id,
    number: round.number,
    status: round.status,
    startsAt: round.startsAt,
    endedAt: round.endedAt,
    cellPoints: round.cellPoints,
    completePoints: round.completePoints,
    podiumBonus: content.podiumBonus,
    serverNow: Date.now(),
  };
}

/**
 * Lo mismo pero con el codigo, para el admin y el proyector.
 *
 * El codigo NUNCA viaja en roundView: esa es la que ven los jugadores, y si
 * fuera ahi bastaria mirar la respuesta de la API para colarse desde la otra
 * sala.
 */
function roundAdminView(round) {
  const base = roundView(round);
  return base && { ...base, code: round.code };
}

async function activate(roundId) {
  clearTimeout(timers.get(roundId));
  timers.delete(roundId);
  const updated = await prisma.round.updateMany({
    where: { id: roundId, status: "COUNTDOWN" },
    data: { status: "ACTIVE" },
  });
  const round = await prisma.round.findUnique({ where: { id: roundId } });
  if (updated.count === 1 && round) {
    hub.publish(["all", "screen", "admin"], "round:started", roundView(round));
  }
  return round;
}

function scheduleActivation(round) {
  clearTimeout(timers.get(round.id));
  const delay = Math.max(0, round.startsAt.getTime() - Date.now());
  const timer = setTimeout(() => {
    activate(round.id).catch((error) => console.error("rondas: no se pudo activar:", error.message));
  }, delay);
  timer.unref?.();
  timers.set(round.id, timer);
}

/** La ronda en marcha del evento (cuenta regresiva o activa), o null. */
async function currentRound(eventId) {
  const round = await prisma.round.findFirst({
    where: { eventId, status: { in: ["COUNTDOWN", "ACTIVE"] } },
    orderBy: { id: "desc" },
  });
  // Si el servidor se reinicio durante la cuenta regresiva, se activa al consultar.
  if (round?.status === "COUNTDOWN" && round.startsAt.getTime() <= Date.now()) {
    return activate(round.id);
  }
  return round;
}

async function endRound(eventId, roundId) {
  clearTimeout(timers.get(roundId));
  timers.delete(roundId);
  const updated = await prisma.round.updateMany({
    where: { id: roundId, eventId, status: { in: ["COUNTDOWN", "ACTIVE"] } },
    data: { status: "ENDED", endedAt: new Date() },
  });
  if (updated.count === 0) throw conflict("Esa ronda ya termino");

  const round = await prisma.round.findUnique({ where: { id: roundId } });
  const summary = await cards.results(roundId);
  hub.publish(["all", "screen", "admin"], "round:ended", { ...roundView(round), results: summary });
  return { round: roundView(round), results: summary };
}

/** Termina la ronda abierta si la hay (al crear otra o al cerrar el evento). */
async function endOpenRound(eventId) {
  const open = await prisma.round.findFirst({
    where: { eventId, status: { in: ["COUNTDOWN", "ACTIVE"] } },
    select: { id: true },
  });
  if (!open) return null;
  return endRound(eventId, open.id).catch(() => null);
}

/**
 * Nueva ronda: termina la anterior, reparte cartillas a todos los inscritos y
 * arranca la cuenta regresiva.
 */
async function startRound(event, { cellPoints, completePoints } = {}) {
  cards.randomCells(); // valida el contenido antes de tocar la base
  await endOpenRound(event.id);

  const last = await prisma.round.findFirst({
    where: { eventId: event.id },
    orderBy: { number: "desc" },
    select: { number: true },
  });

  let created;
  try {
    // Ya no hay transaccion larga: antes esto insertaba una cartilla con nueve
    // casillas por cada inscrito, y con cientos de personas era el momento mas
    // pesado del evento. Ahora crear la ronda es una sola fila.
    created = await prisma.round.create({
      data: {
        eventId: event.id,
        number: (last?.number ?? 0) + 1,
        code: newRoundCode(),
        startsAt: new Date(Date.now() + COUNTDOWN_MS),
        cellPoints: cellPoints ?? content.cellPoints,
        completePoints: completePoints ?? content.completePoints,
      },
    });
  } catch (error) {
    // Indice parcial: dos pestanas del admin creando ronda a la vez.
    if (isUniqueViolation(error)) throw conflict("Ya hay una ronda en curso");
    throw error;
  }

  scheduleActivation(created);
  // A los jugadores les llega la ronda sin codigo; al proyector y al panel, con el.
  hub.publish(["all"], "round:countdown", roundView(created));
  hub.publish(["screen", "admin"], "round:countdown", roundAdminView(created));
  return { round: roundAdminView(created) };
}

/** La ultima ronda terminada del evento, con sus ganadores. */
async function lastEnded(eventId) {
  const round = await prisma.round.findFirst({
    where: { eventId, status: "ENDED" },
    orderBy: { id: "desc" },
  });
  if (!round) return null;
  return { round: roundView(round), results: await cards.results(round.id) };
}

/** Tras un reinicio: reprograma las cuentas regresivas pendientes. */
async function recoverRounds() {
  const pending = await prisma.round.findMany({ where: { status: "COUNTDOWN" } });
  for (const round of pending) scheduleActivation(round);
  return pending.length;
}

module.exports = {
  COUNTDOWN_MS,
  roundView,
  roundAdminView,
  currentRound,
  startRound,
  endRound,
  endOpenRound,
  lastEnded,
  recoverRounds,
};
