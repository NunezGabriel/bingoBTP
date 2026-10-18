const express = require("express");
const { prisma } = require("../../lib/prisma");
const { conflict, notFound, toInt, toText } = require("../../lib/http");
const { eventView } = require("../../services/events");
const lifecycle = require("../../services/lifecycle");

const router = express.Router();

router.get("/", async (req, res) => {
  const events = await prisma.event.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { players: true, rounds: true } } },
  });
  res.json({
    events: events.map((e) => ({
      ...eventView(e),
      createdAt: e.createdAt,
      players: e._count.players,
      rounds: e._count.rounds,
    })),
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

/** Borra un evento creado por error: solo si nunca tuvo jugadores ni puntos. */
router.delete("/:id", async (req, res) => {
  const id = toInt(req.params.id, "id", { min: 1 });
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) throw notFound("Evento no encontrado");
  if (event.status === "LIVE") throw conflict("Cierra el evento antes de borrarlo");

  const [players, points] = await Promise.all([
    prisma.eventPlayer.count({ where: { eventId: id } }),
    prisma.pointLedger.count({ where: { eventId: id } }),
  ]);
  if (players > 0 || points > 0) {
    throw conflict("Ese evento ya tuvo jugadores: se conserva para su historial");
  }
  await prisma.event.delete({ where: { id } });
  res.json({ ok: true });
});

module.exports = router;
