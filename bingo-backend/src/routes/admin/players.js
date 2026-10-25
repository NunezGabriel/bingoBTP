const crypto = require("node:crypto");
const express = require("express");
const { prisma } = require("../../lib/prisma");
const { withTx } = require("../../lib/tx");
const { hashPin, isValidPin } = require("../../lib/pin");
const { badRequest, conflict, notFound, toInt, toText } = require("../../lib/http");
const hub = require("../../realtime/hub");
const { getLiveEvent, forgetJoined } = require("../../services/events");
const { invalidatePlayer } = require("../../services/players");
const { grant, announceGrants } = require("../../services/points");

const router = express.Router();
const PAGE_SIZE = 50;

/** Lista de jugadores. ?q= busca por nombre o codigo; ?scope=event solo los del evento abierto. */
router.get("/", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const page = req.query.page ? toInt(req.query.page, "page", { min: 1, max: 1000 }) : 1;
  const event = await getLiveEvent();
  const onlyEvent = req.query.scope === "event" && event;

  const where = {
    ...(q ? { OR: [{ nameKey: { contains: q.toLowerCase() } }, { code: q.toUpperCase() }] } : {}),
    ...(onlyEvent ? { events: { some: { eventId: event.id } } } : {}),
  };

  const [total, players] = await Promise.all([
    prisma.player.count({ where }),
    prisma.player.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: event ? { events: { where: { eventId: event.id }, select: { points: true } } } : undefined,
    }),
  ]);

  res.json({
    total,
    page,
    hasMore: page * PAGE_SIZE < total,
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      role: p.role,
      skin: p.skin,
      createdAt: p.createdAt,
      inEvent: Boolean(p.events?.length),
      points: p.events?.[0]?.points ?? null,
    })),
  });
});

async function playerOrFail(req) {
  const id = toInt(req.params.id, "id", { min: 1 });
  const player = await prisma.player.findUnique({ where: { id } });
  if (!player) throw notFound("Jugador no encontrado");
  return player;
}

/** Ajuste manual de puntos (premios del escenario, correcciones...). */
router.post("/:id/points", async (req, res) => {
  const player = await playerOrFail(req);
  const amount = toInt(req.body?.amount, "amount", { min: -5000, max: 5000 });
  if (amount === 0) throw badRequest("La cantidad no puede ser 0");
  const reason = toText(req.body?.reason, "reason", { min: 3, max: 80 });

  const event = await getLiveEvent();
  if (!event) throw conflict("Solo se ajustan puntos con un evento abierto");

  const results = await withTx(async (tx, onCommit) => {
    const granted = await grant(tx, event.id, [
      { playerId: player.id, amount, refKey: `ajuste:${crypto.randomUUID()}`, label: reason },
    ]);
    onCommit(() => announceGrants(event.id, granted));
    return granted;
  });
  res.json({ ok: true, points: results[0]?.points ?? null });
});

/** Si alguien olvido su clave: el admin le pone una nueva y se la dice. */
router.post("/:id/clave", async (req, res) => {
  const player = await playerOrFail(req);
  const clave = String(req.body?.clave ?? req.body?.pin ?? "");
  if (!isValidPin(clave)) throw badRequest("La clave debe tener de 4 a 8 digitos");

  await prisma.player.update({
    where: { id: player.id },
    data: { claveHash: await hashPin(clave), sessionVersion: { increment: 1 } },
  });
  invalidatePlayer(player.id);
  res.json({ ok: true });
});

/**
 * Borra a todos los jugadores (cuentas, cartillas y puntos). Para empezar de
 * cero. Las cuentas de admin no se tocan: si se borraran, nadie podria volver
 * a entrar al panel.
 */
router.delete("/", async (req, res) => {
  const deleted = await prisma.player.deleteMany({ where: { role: "PLAYER" } });
  invalidatePlayer([]);
  forgetJoined();
  const event = await getLiveEvent();
  hub.publish(["all", "screen"], "session:update", { reason: "reset" });
  res.json({ ok: true, deleted: deleted.count });
});

router.delete("/:id", async (req, res) => {
  const player = await playerOrFail(req);
  if (player.role === "ADMIN") throw conflict("Las cuentas de admin no se borran desde aqui");
  // Las relaciones tienen ON DELETE CASCADE: cartillas, firmas y puntos.
  await prisma.player.delete({ where: { id: player.id } });
  invalidatePlayer(player.id);
  forgetJoined(player.id);
  const event = await getLiveEvent();
  hub.toPlayer(player.id, "session:update", { reason: "deleted" });
  res.json({ ok: true, name: player.name });
});

module.exports = router;
