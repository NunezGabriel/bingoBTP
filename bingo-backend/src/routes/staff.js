const express = require("express");
const { prisma } = require("../lib/prisma");
const { conflict, badRequest } = require("../lib/http");
const { resolvePlayerCode } = require("../lib/playerCode");
const { requireRole, requireLiveEvent } = require("../middleware/auth");
const { publicPlayer } = require("../services/players");
const { ensureJoined } = require("../services/events");
const { missionsForPlayer, awardMission } = require("../services/missions");

const router = express.Router();
router.use(requireRole("STAFF", "ADMIN"), requireLiveEvent);

/**
 * El jugador le dicta su codigo al staff; el staff lo escribe y ve sus puntos
 * y las misiones (definidas en src/content/missions.js).
 */
router.get("/player/:code", async (req, res) => {
  const player = await resolvePlayerCode(req, req.params.code);
  const standing = await prisma.eventPlayer.findUnique({
    where: { eventId_playerId: { eventId: req.event.id, playerId: player.id } },
    select: { points: true },
  });

  res.json({
    player: publicPlayer(player),
    role: player.role,
    points: standing?.points ?? 0,
    missions: await missionsForPlayer(req.event.id, player.id),
  });
});

router.post("/award", async (req, res) => {
  const player = await resolvePlayerCode(req, req.body?.code);
  const key = typeof req.body?.mission === "string" ? req.body.mission : "";
  if (!key) throw badRequest("Elige una mision");
  if (player.role !== "PLAYER") throw conflict("Solo se dan misiones a jugadores");

  // Si tiene cuenta de otro evento y aun no abrio la app en este, queda inscrito.
  await ensureJoined(req.event.id, player.id);
  const result = await awardMission(req.event, key, player, req.player);
  res.json({ ok: true, player: publicPlayer(player), ...result });
});

module.exports = router;
