const express = require("express");
const { prisma } = require("../../lib/prisma");
const { hashPin, isValidPin } = require("../../lib/pin");
const { badRequest, conflict, notFound, toInt } = require("../../lib/http");
const hub = require("../../realtime/hub");
const { getLiveEvent, forgetJoined } = require("../../services/events");
const { invalidatePlayer, publicPlayer } = require("../../services/players");
const { leaderboardChanged } = require("../../services/leaderboard");

const router = express.Router();
const PAGE_SIZE = 50;

/** Lista de usuarios. ?q= busca por nombre o codigo; ?scope=event solo los del evento abierto. */
router.get("/", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const page = req.query.page ? toInt(req.query.page, "page", { min: 1, max: 1000 }) : 1;
  const event = await getLiveEvent();
  const onlyEvent = req.query.scope === "event" && event;

  const where = {
    ...(q ? { OR: [{ nicknameKey: { contains: q.toLowerCase() } }, { code: q.toUpperCase() }] } : {}),
    ...(onlyEvent ? { events: { some: { eventId: event.id } } } : {}),
  };

  const [total, users] = await Promise.all([
    prisma.player.count({ where }),
    prisma.player.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: event ? { events: { where: { eventId: event.id }, select: { points: true } } } : undefined,
    }),
  ]);

  res.json({
    total,
    page,
    hasMore: page * PAGE_SIZE < total,
    users: users.map((u) => ({
      ...publicPlayer(u),
      code: u.code,
      role: u.role,
      xp: u.xp,
      createdAt: u.createdAt,
      inEvent: Boolean(u.events?.length),
      eventPoints: u.events?.[0]?.points ?? null,
    })),
  });
});

async function editableUser(req) {
  const id = toInt(req.params.id, "id", { min: 1 });
  const user = await prisma.player.findUnique({ where: { id } });
  if (!user) throw notFound("Usuario no encontrado");
  return user;
}

/** Si alguien olvido su PIN: el admin le pone uno nuevo y se lo dice. */
router.post("/:id/pin", async (req, res) => {
  const user = await editableUser(req);
  const pin = String(req.body?.pin ?? "");
  if (!isValidPin(pin)) throw badRequest("El PIN debe tener de 4 a 8 digitos");
  await prisma.player.update({
    where: { id: user.id },
    data: { pinHash: await hashPin(pin), sessionVersion: { increment: 1 } },
  });
  invalidatePlayer(user.id);
  res.json({ ok: true });
});

/** Volver staff a un jugador (o quitarselo). Los admins se definen en el .env. */
router.post("/:id/role", async (req, res) => {
  const user = await editableUser(req);
  const role = req.body?.role;
  if (!["PLAYER", "STAFF"].includes(role)) throw badRequest("Rol invalido");
  if (user.role === "ADMIN") throw conflict("A un admin no se le cambia el rol desde aqui");

  await prisma.player.update({ where: { id: user.id }, data: { role } });
  invalidatePlayer(user.id);
  hub.toPlayer(user.id, "session:update", { role });
  const event = await getLiveEvent();
  if (event) leaderboardChanged(event.id);
  res.json({ ok: true, role });
});

router.delete("/:id", async (req, res) => {
  const user = await editableUser(req);
  if (user.role === "ADMIN") throw conflict("No se puede eliminar a un admin");

  // Las relaciones tienen ON DELETE CASCADE: cartillas, puntos, contactos, trofeos.
  await prisma.player.delete({ where: { id: user.id } });
  invalidatePlayer(user.id);
  forgetJoined(user.id);
  const event = await getLiveEvent();
  if (event) leaderboardChanged(event.id);
  res.json({ ok: true, nickname: user.nickname });
});

module.exports = router;
