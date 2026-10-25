const express = require("express");
const { prisma } = require("../lib/prisma");
const { toInt, conflict, badRequest, tooMany } = require("../lib/http");
const { normalizeCode } = require("../lib/codes");
const rateLimit = require("../lib/rateLimit");
const { resolvePlayerCode } = require("../lib/playerCode");
const { requirePlayer, requireLiveEvent } = require("../middleware/auth");
const hub = require("../realtime/hub");
const rounds = require("../services/rounds");
const cards = require("../services/cards");

const router = express.Router();
router.use(requirePlayer, requireLiveEvent);

/** La ronda en marcha, la cartilla del jugador y quienes ya completaron. */
router.get("/current", async (req, res) => {
  const round = await rounds.currentRound(req.event.id);
  if (!round) return res.json({ round: null, card: null, winners: [] });

  // Sin cartilla no entro a esta ronda: ve que hay bingo, pero no el juego.
  const mine = round.status === "ACTIVE" ? await cards.findCard(round.id, req.player.id) : null;
  const winners = mine ? await cards.podium(round.id) : [];
  res.json({
    round: rounds.roundView(round),
    card: mine ? cards.cardView(mine, round) : null,
    winners,
  });
});

/**
 * Entrar a la ronda con el codigo proyectado.
 *
 * Es lo que separa un auditorio del otro: la ronda esta abierta para todos,
 * pero solo juega quien puede leer el codigo en la pantalla de su sala.
 * La cartilla se crea aqui, y tenerla es el registro de haber entrado.
 */
router.post("/entrar", async (req, res) => {
  const round = await rounds.currentRound(req.event.id);
  if (!round) throw conflict("Todavia no hay bingo. Espera a que te den el codigo");

  // Cuatro letras se pueden adivinar a fuerza bruta. Doce intentos por persona
  // cada diez minutos no molesta a quien se equivoca, y corta al que prueba.
  const llave = `bingo:entrar:${req.player.id}`;
  const limite = rateLimit.peek(llave, 12);
  if (!limite.ok) throw tooMany("Demasiados intentos. Espera unos minutos", limite.retryAfterMs);

  const codigo = normalizeCode(req.body?.codigo);
  if (!codigo || codigo !== round.code) {
    rateLimit.hit(llave, 12, 10 * 60_000);
    throw badRequest("Ese no es el codigo de esta ronda");
  }
  rateLimit.reset(llave);

  const card = await cards.getOrCreateCard(round, req.player.id);
  // El panel lleva la cuenta de cuantos entraron, para saber cuando arrancar.
  const entraron = await prisma.card.count({ where: { roundId: round.id } });
  hub.publish(["admin", "screen"], "round:entraron", { roundId: round.id, entraron });

  res.json({ round: rounds.roundView(round), card: cards.cardView(card, round) });
});

router.post("/sign", async (req, res) => {
  const round = await rounds.currentRound(req.event.id);
  if (!round) throw conflict("No hay una ronda en curso");

  const position = toInt(req.body?.position, "position", { min: 0, max: cards.CARD_SIZE - 1 });
  const signer = await resolvePlayerCode(req, req.body?.code);
  res.json(await cards.signCell(req.event, round, req.player, position, signer));
});

module.exports = router;
