const express = require("express");
const { prisma } = require("../lib/prisma");
const { hashPin, verifyPin, isValidPin } = require("../lib/pin");
const { issueSession, issueTicket } = require("../lib/session");
const { badRequest, unauthorized } = require("../lib/http");
const { requirePlayer, requireSession } = require("../middleware/auth");
const { selfPlayer, invalidatePlayer } = require("../services/players");
const { getLiveEvent, ensureJoined, eventView } = require("../services/events");
const { rankOf } = require("../services/leaderboard");
const { normalizeSkin, SKINS } = require("../content/skins");
const missions = require("../services/missions");
const rounds = require("../services/rounds");

const router = express.Router();

/**
 * Estado de quien entro: quien es, el evento abierto, sus puntos, la ronda y
 * como va su tarjeta. Es lo primero que pide la app al abrir, y con esto decide
 * sola si te manda al panel de admin, a elegir personaje o al lobby.
 */
router.get("/", requireSession, async (req, res) => {
  const me = selfPlayer(req.player);
  const event = await getLiveEvent();

  if (req.player.role === "ADMIN") {
    return res.json({ player: me, event: eventView(event), standing: null, round: null, card: null });
  }

  let standing = null;
  let round = null;
  let card = null;
  if (event) {
    await ensureJoined(event.id, req.player.id);
    const [rank, current, tarjeta] = await Promise.all([
      rankOf(event.id, req.player.id),
      rounds.currentRound(event.id),
      missions.cardOf(event.id, req.player.id),
    ]);
    standing = rank;
    round = rounds.roundView(current);
    card = { done: tarjeta.done, total: tarjeta.total };
  }
  res.json({ player: me, event: eventView(event), standing, round, card });
});

/** Los personajes que se pueden elegir. */
router.get("/skins", requirePlayer, (req, res) => {
  res.json({ skins: SKINS, skin: req.player.skin ?? null });
});

router.post("/skin", requirePlayer, async (req, res) => {
  const skin = normalizeSkin(req.body?.skin);
  if (!skin) throw badRequest("Elige uno de los personajes");
  const player = await prisma.player.update({
    where: { id: req.player.id },
    data: { skin },
  });
  invalidatePlayer(player.id);
  res.json({ player: selfPlayer(player) });
});

/** Permiso corto para abrir el WebSocket del lobby. */
router.post("/lobby-ticket", requirePlayer, (req, res) => {
  res.json({ ticket: issueTicket(req.player) });
});

/** La tarjeta de misiones completa, con el codigo que el admin escanea. */
router.get("/misiones", requirePlayer, async (req, res) => {
  const event = await getLiveEvent();
  const card = await missions.cardOf(event?.id ?? null, req.player.id);
  res.json({ ...card, code: req.player.code, event: eventView(event) });
});

router.post("/clave", requireSession, async (req, res) => {
  const actual = String(req.body?.actual ?? "");
  const nueva = String(req.body?.nueva ?? "");
  // Al admin no se le pide formato de PIN: su clave es larga.
  if (req.player.role === "PLAYER" && !isValidPin(nueva)) {
    throw badRequest("Tu clave nueva debe ser de 4 a 8 numeros");
  }
  if (nueva.length < 4) throw badRequest("Tu clave nueva es muy corta");
  if (!(await verifyPin(actual, req.player.claveHash))) {
    throw unauthorized("Tu clave actual no es correcta");
  }
  const player = await prisma.player.update({
    where: { id: req.player.id },
    data: { claveHash: await hashPin(nueva), sessionVersion: { increment: 1 } },
  });
  invalidatePlayer(player.id);
  // Cierra las demas sesiones pero mantiene esta.
  issueSession(res, player);
  res.json({ ok: true });
});

/** Eventos en los que jugo, con sus puntos y su puesto final. */
router.get("/history", requirePlayer, async (req, res) => {
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
