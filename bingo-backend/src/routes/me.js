const express = require("express");
const { prisma } = require("../lib/prisma");
const { hashPin, verifyPin, isValidPin } = require("../lib/pin");
const { issueSession } = require("../lib/session");
const { badRequest, unauthorized } = require("../lib/http");
const { requirePlayer } = require("../middleware/auth");
const { selfPlayer, invalidatePlayer } = require("../services/players");
const { getLiveEvent, ensureJoined, eventView } = require("../services/events");
const { rankOf } = require("../services/leaderboard");
const rounds = require("../services/rounds");

const router = express.Router();
router.use(requirePlayer);

/** Estado del jugador: quien es, el evento abierto, sus puntos y la ronda. */
router.get("/", async (req, res) => {
  const event = await getLiveEvent();
  let standing = null;
  let round = null;
  if (event) {
    await ensureJoined(event.id, req.player.id);
    const [rank, current] = await Promise.all([
      rankOf(event.id, req.player.id),
      rounds.currentRound(event.id),
    ]);
    standing = rank;
    round = rounds.roundView(current);
  }
  res.json({ player: selfPlayer(req.player), event: eventView(event), standing, round });
});

router.post("/pin", async (req, res) => {
  const currentPin = String(req.body?.currentPin ?? "");
  const newPin = String(req.body?.newPin ?? "");
  if (!isValidPin(newPin)) throw badRequest("El nuevo PIN debe tener de 4 a 8 digitos");
  if (!(await verifyPin(currentPin, req.player.pinHash))) {
    throw unauthorized("Tu PIN actual no es correcto");
  }
  const player = await prisma.player.update({
    where: { id: req.player.id },
    data: { pinHash: await hashPin(newPin), sessionVersion: { increment: 1 } },
  });
  invalidatePlayer(player.id);
  // Cierra las demas sesiones pero mantiene esta.
  issueSession(res, player);
  res.json({ ok: true });
});

/** Eventos en los que jugo, con sus puntos y su puesto final. */
router.get("/history", async (req, res) => {
  const participations = await prisma.eventPlayer.findMany({
    where: { playerId: req.player.id },
    orderBy: { joinedAt: "desc" },
    include: { event: { select: { id: true, name: true, status: true, closedAt: true } } },
  });

  res.json({
    events: participations.map((p) => ({
      id: p.event.id,
      name: p.event.name,
      status: p.event.status,
      points: p.points,
      finalRank: p.finalRank,
      joinedAt: p.joinedAt,
      closedAt: p.event.closedAt,
    })),
  });
});

module.exports = router;
