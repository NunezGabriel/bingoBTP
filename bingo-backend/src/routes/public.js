const express = require("express");
const { toInt } = require("../lib/http");
const hub = require("../realtime/hub");
const { getLiveEvent, eventView, houseCounts } = require("../services/events");
const leaderboard = require("../services/leaderboard");
const games = require("../services/games");
const bingo = require("../services/bingo");

const router = express.Router();

/**
 * Portada y creacion de personaje: evento abierto y cuantos miembros tiene
 * cada casa, para que la gente pueda equilibrar las casas al elegir.
 */
router.get("/event", async (req, res) => {
  const event = await getLiveEvent();
  if (!event) return res.json({ event: null, players: 0, houses: [] });
  const houses = await houseCounts(event.id);
  const players = houses.reduce((sum, h) => sum + h.players, 0);
  res.json({ event: eventView(event), players, houses });
});

router.get("/leaderboard", async (req, res) => {
  const limit = req.query.limit ? toInt(req.query.limit, "limit", { min: 1, max: 100 }) : 50;
  const event = await getLiveEvent();
  if (!event) return res.json({ event: null, top: [], houses: [], me: null });

  const [top, houses, me] = await Promise.all([
    leaderboard.topPlayers(event.id, limit),
    leaderboard.houseStandings(event.id),
    req.player ? leaderboard.rankOf(event.id, req.player.id) : null,
  ]);
  res.json({ event: eventView(event), top, houses, me });
});

/** Estado inicial de la pantalla gigante (luego se actualiza por SSE). */
router.get("/screen", async (req, res) => {
  const event = await getLiveEvent();
  if (!event) return res.json({ event: null });

  const [top, houses, running] = await Promise.all([
    leaderboard.topPlayers(event.id, 10),
    leaderboard.houseStandings(event.id),
    games.runningSession(event.id),
  ]);

  res.json({
    event: eventView(event),
    top,
    houses,
    players: houses.reduce((sum, h) => sum + h.players, 0),
    game: running ? games.sessionView(running) : null,
    bingo: running ? await bingo.results(running.id) : null,
    realtime: hub.stats(),
  });
});

module.exports = router;
