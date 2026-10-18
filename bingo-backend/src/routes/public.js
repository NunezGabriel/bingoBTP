const express = require("express");
const { toInt } = require("../lib/http");
const hub = require("../realtime/hub");
const { getLiveEvent, eventView, countPlayers } = require("../services/events");
const leaderboard = require("../services/leaderboard");
const rounds = require("../services/rounds");
const cards = require("../services/cards");

const router = express.Router();

/** Portada: el evento abierto y cuanta gente esta jugando. */
router.get("/event", async (req, res) => {
  const event = await getLiveEvent();
  if (!event) return res.json({ event: null, players: 0 });
  res.json({ event: eventView(event), players: await countPlayers(event.id) });
});

router.get("/leaderboard", async (req, res) => {
  const limit = req.query.limit ? toInt(req.query.limit, "limit", { min: 1, max: 100 }) : 50;
  const event = await getLiveEvent();
  if (!event) return res.json({ event: null, top: [], me: null });

  const [top, me] = await Promise.all([
    leaderboard.topPlayers(event.id, limit),
    req.player ? leaderboard.rankOf(event.id, req.player.id) : null,
  ]);
  res.json({ event: eventView(event), top, me });
});

/** Estado inicial de la pantalla gigante (luego se actualiza por SSE). */
router.get("/screen", async (req, res) => {
  const event = await getLiveEvent();
  if (!event) return res.json({ event: null });

  const [top, players, round] = await Promise.all([
    leaderboard.topPlayers(event.id, 10),
    countPlayers(event.id),
    rounds.currentRound(event.id),
  ]);

  res.json({
    event: eventView(event),
    top,
    players,
    round: rounds.roundView(round),
    progress: round ? await cards.results(round.id) : null,
    realtime: hub.stats(),
  });
});

module.exports = router;
