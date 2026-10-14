const express = require("express");
const { toInt, conflict } = require("../lib/http");
const { resolvePlayerCode } = require("../lib/playerCode");
const { requirePlayer, requireLiveEvent } = require("../middleware/auth");
const rounds = require("../services/rounds");
const cards = require("../services/cards");

const router = express.Router();
router.use(requirePlayer, requireLiveEvent);

/** La ronda en marcha, la cartilla del jugador y quienes ya completaron. */
router.get("/current", async (req, res) => {
  const round = await rounds.currentRound(req.event.id);
  if (!round) return res.json({ round: null, card: null, winners: [] });

  let card = null;
  let winners = [];
  if (round.status === "ACTIVE") {
    const [mine, top] = await Promise.all([
      cards.getOrCreateCard(round, req.player.id),
      cards.podium(round.id),
    ]);
    card = cards.cardView(mine, round);
    winners = top;
  }
  res.json({ round: rounds.roundView(round), card, winners });
});

router.post("/sign", async (req, res) => {
  const round = await rounds.currentRound(req.event.id);
  if (!round) throw conflict("No hay una ronda en curso");

  const position = toInt(req.body?.position, "position", { min: 0, max: cards.CARD_SIZE - 1 });
  const signer = await resolvePlayerCode(req, req.body?.code);
  res.json(await cards.signCell(req.event, round, req.player, position, signer));
});

module.exports = router;
