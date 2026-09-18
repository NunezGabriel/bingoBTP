const express = require("express");
const { prisma } = require("../../lib/prisma");
const { conflict, notFound, toInt, toText } = require("../../lib/http");
const hub = require("../../realtime/hub");
const { getLiveEvent, eventView, countPlayers, houseCounts } = require("../../services/events");
const lifecycle = require("../../services/lifecycle");

const router = express.Router();

/** Todos los eventos y, del abierto, sus inscritos por casa y cuantos estan conectados. */
router.get("/", async (req, res) => {
  const [events, live] = await Promise.all([
    prisma.event.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { players: { where: { player: { role: "PLAYER" } } } } } },
    }),
    getLiveEvent(),
  ]);

  res.json({
    events: events.map((e) => ({ ...eventView(e), createdAt: e.createdAt, players: e._count.players })),
    live: live
      ? {
          ...eventView(live),
          players: await countPlayers(live.id),
          houses: await houseCounts(live.id),
          connected: hub.stats().connections,
        }
      : null,
  });
});

router.post("/", async (req, res) => {
  const name = toText(req.body?.name, "name", { min: 3, max: 60 });
  const event = await prisma.event.create({ data: { name } });
  res.status(201).json({ event: eventView(event) });
});

router.post("/:id/open", async (req, res) => {
  const event = await lifecycle.open(toInt(req.params.id, "id", { min: 1 }));
  res.json({ event: eventView(event) });
});

router.post("/:id/close", async (req, res) => {
  const result = await lifecycle.close(toInt(req.params.id, "id", { min: 1 }));
  res.json({ ok: true, ...result });
});

/**
 * Borra un evento creado por error. Solo si nunca tuvo jugadores ni puntos:
 * el historial de un evento real no se toca.
 */
router.delete("/:id", async (req, res) => {
  const id = toInt(req.params.id, "id", { min: 1 });
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) throw notFound("Evento no encontrado");
  if (event.status === "LIVE") throw conflict("Cierra el evento antes de borrarlo");

  const [players, points] = await Promise.all([
    prisma.eventPlayer.count({ where: { eventId: id, player: { role: "PLAYER" } } }),
    prisma.pointLedger.count({ where: { eventId: id } }),
  ]);
  if (players > 0 || points > 0) {
    throw conflict("Ese evento ya tuvo jugadores: se conserva para su historial");
  }
  await prisma.event.delete({ where: { id } });
  res.json({ ok: true });
});

module.exports = router;
