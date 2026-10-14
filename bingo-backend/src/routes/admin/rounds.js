const express = require("express");
const { conflict, toInt } = require("../../lib/http");
const { getLiveEvent } = require("../../services/events");
const rounds = require("../../services/rounds");

const router = express.Router();

async function liveEventOrFail() {
  const event = await getLiveEvent();
  if (!event) throw conflict("Abre un evento antes de empezar una ronda");
  return event;
}

/**
 * Nueva ronda: termina la anterior si sigue abierta y reparte cartillas
 * nuevas a todos los inscritos.
 */
router.post("/", async (req, res) => {
  const event = await liveEventOrFail();
  const cellPoints =
    req.body?.cellPoints === undefined ? undefined : toInt(req.body.cellPoints, "cellPoints", { min: 0, max: 1000 });
  const completePoints =
    req.body?.completePoints === undefined
      ? undefined
      : toInt(req.body.completePoints, "completePoints", { min: 0, max: 5000 });

  res.status(201).json(await rounds.startRound(event, { cellPoints, completePoints }));
});

router.post("/:id/end", async (req, res) => {
  const event = await liveEventOrFail();
  res.json(await rounds.endRound(event.id, toInt(req.params.id, "id", { min: 1 })));
});

module.exports = router;
