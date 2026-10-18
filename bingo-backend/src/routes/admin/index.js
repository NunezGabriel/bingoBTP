const express = require("express");
const hub = require("../../realtime/hub");
const lobby = require("../../realtime/lobby");
const { requireAdmin } = require("../../middleware/auth");
const { getLiveEvent, eventView, countPlayers } = require("../../services/events");
const leaderboard = require("../../services/leaderboard");
const rounds = require("../../services/rounds");
const cards = require("../../services/cards");
const missions = require("../../services/missions");

const router = express.Router();

// No hay login de admin: se entra por la misma puerta que todos y manda el rol
// de la cuenta, que se lee de la base en cada peticion.
router.use(requireAdmin);

/** Todo lo que muestra la pantalla principal del panel, en una sola llamada. */
router.get("/overview", async (req, res) => {
  const event = await getLiveEvent();
  if (!event) {
    return res.json({ event: null, players: 0, connected: hub.stats().connections, lobby: lobby.count() });
  }

  const [players, round, top, tarjetas] = await Promise.all([
    countPlayers(event.id),
    rounds.currentRound(event.id),
    leaderboard.topPlayers(event.id, 10),
    missions.report(event.id),
  ]);

  res.json({
    event: eventView(event),
    players,
    connected: hub.stats().connections,
    lobby: lobby.count(),
    top,
    round: round ? { ...rounds.roundView(round), progress: await cards.results(round.id) } : null,
    lastRound: round ? null : await rounds.lastEnded(event.id),
    missions: {
      completas: tarjetas.completas.length,
      porMision: tarjetas.porMision,
      total: tarjetas.total,
    },
  });
});

router.use("/events", require("./events"));
router.use("/rounds", require("./rounds"));
router.use("/players", require("./players"));
router.use("/missions", require("./missions"));

module.exports = router;
