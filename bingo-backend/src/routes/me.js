const express = require("express");
const { prisma } = require("../lib/prisma");
const { hashPin, verifyPin, isValidPin } = require("../lib/pin");
const { issueSession } = require("../lib/session");
const { resolvePlayerCode } = require("../lib/playerCode");
const { badRequest, conflict, unauthorized } = require("../lib/http");
const { CLASSES, HOUSES, CLASS_UNLOCKS, isClassUnlocked, levelFromXp } = require("../lib/progression");
const { requirePlayer } = require("../middleware/auth");
const { selfPlayer, invalidatePlayer, publicPlayer } = require("../services/players");
const { getLiveEvent, ensureJoined, eventView } = require("../services/events");
const { rankOf } = require("../services/leaderboard");
const { addContact, listContacts } = require("../services/contacts");
const games = require("../services/games");

const router = express.Router();
router.use(requirePlayer);

/**
 * Todo lo que ve el jugador en su pantalla principal. Entrar a la app con un
 * evento abierto lo inscribe en ese evento.
 */
router.get("/", async (req, res) => {
  const event = await getLiveEvent();
  let standing = null;
  let game = null;
  if (event) {
    await ensureJoined(event.id, req.player.id);
    const [rank, running] = await Promise.all([
      rankOf(event.id, req.player.id),
      games.runningSession(event.id),
    ]);
    standing = rank;
    game = running ? games.sessionView(running) : null;
  }
  res.json({
    player: selfPlayer(req.player),
    event: eventView(event),
    standing,
    game,
  });
});

router.get("/contacts", async (req, res) => {
  res.json({ contacts: await listContacts(req.player.id) });
});

router.post("/contacts", async (req, res) => {
  const other = await resolvePlayerCode(req, req.body?.code);
  const event = await getLiveEvent();
  const isNew = await addContact(event?.id ?? null, req.player, other);
  res.status(isNew ? 201 : 200).json({ isNew, player: publicPlayer(other) });
});

router.patch("/avatar", async (req, res) => {
  const avatarClass = req.body?.avatarClass;
  const avatarHouse = req.body?.avatarHouse;
  const data = {};
  const level = levelFromXp(req.player.xp);

  if (avatarClass !== undefined) {
    if (!CLASSES.includes(avatarClass)) throw badRequest("Clase invalida");
    if (!isClassUnlocked(avatarClass, level)) {
      throw conflict(`Esa clase se desbloquea en el nivel ${CLASS_UNLOCKS[avatarClass]}`);
    }
    data.avatarClass = avatarClass;
  }

  if (avatarHouse !== undefined && avatarHouse !== req.player.avatarHouse) {
    if (!HOUSES.includes(avatarHouse)) throw badRequest("Casa invalida");
    // Los puntos del evento suman a la casa actual: cambiarse a mitad del
    // evento arrastraria tus puntos a otra casa.
    if (await getLiveEvent()) throw conflict("No puedes cambiar de casa durante un evento");
    data.avatarHouse = avatarHouse;
  }

  if (!Object.keys(data).length) throw badRequest("Nada que actualizar");
  const player = await prisma.player.update({ where: { id: req.player.id }, data });
  invalidatePlayer(player.id);
  res.json({ player: selfPlayer(player) });
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

/** Eventos a los que fue, con sus puntos, puesto final y trofeo. */
router.get("/history", async (req, res) => {
  const playerId = req.player.id;
  const participations = await prisma.eventPlayer.findMany({
    where: { playerId },
    orderBy: { joinedAt: "desc" },
    include: {
      event: {
        select: {
          id: true,
          name: true,
          status: true,
          closedAt: true,
          trophies: { where: { playerId }, select: { kind: true, rank: true } },
        },
      },
    },
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
      trophy: p.event.trophies[0] ?? null,
    })),
  });
});

module.exports = router;
