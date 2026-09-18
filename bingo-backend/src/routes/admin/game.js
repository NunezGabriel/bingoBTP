const express = require("express");
const { conflict, toInt } = require("../../lib/http");
const { getLiveEvent } = require("../../services/events");
const games = require("../../services/games");
const bingo = require("../../services/bingo");

const router = express.Router();

async function liveEventOrFail() {
  const event = await getLiveEvent();
  if (!event) throw conflict("Abre un evento antes de iniciar un juego");
  return event;
}

/** El juego en marcha (con su avance) o el ultimo que termino. */
router.get("/", async (req, res) => {
  const event = await getLiveEvent();
  if (!event) return res.json({ event: null, running: null, last: null });

  const running = await games.runningSession(event.id);
  res.json({
    event: { id: event.id, name: event.name },
    running: running ? { ...games.sessionView(running), progress: await bingo.results(running.id) } : null,
    last: running ? null : await games.lastEnded(event.id),
  });
});

router.post("/bingo/start", async (req, res) => {
  const event = await liveEventOrFail();
  res.status(201).json(await games.startBingo(event));
});

router.post("/:id/end", async (req, res) => {
  const event = await liveEventOrFail();
  res.json(await games.endGame(event.id, toInt(req.params.id, "id", { min: 1 })));
});

module.exports = router;
