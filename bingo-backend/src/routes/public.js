const express = require("express");
const { toInt } = require("../lib/http");
const hub = require("../realtime/hub");
const { getLiveEvent, eventView, countPlayers } = require("../services/events");
const rounds = require("../services/rounds");
const cards = require("../services/cards");

const router = express.Router();

/** Portada: el evento abierto y cuanta gente esta jugando. */
router.get("/event", async (req, res) => {
  const event = await getLiveEvent();
  if (!event) return res.json({ event: null, players: 0 });
  res.json({ event: eventView(event), players: await countPlayers(event.id) });
});

/** Estado inicial de la pantalla gigante (luego se actualiza por SSE). */
router.get("/screen", async (req, res) => {
  const event = await getLiveEvent();
  if (!event) return res.json({ event: null });

  const [players, round] = await Promise.all([
    countPlayers(event.id),
    rounds.currentRound(event.id),
  ]);

  res.json({
    event: eventView(event),
    players,
    round: rounds.roundView(round),
    progress: round ? await cards.results(round.id) : null,
    realtime: hub.stats(),
  });
});

module.exports = router;
