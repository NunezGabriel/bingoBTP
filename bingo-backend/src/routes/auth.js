const express = require("express");
const { prisma, isUniqueViolation } = require("../lib/prisma");
const { hashPin, verifyPin, isValidPin } = require("../lib/pin");
const { issueSession, clearSession } = require("../lib/session");
const { newPlayerCode } = require("../lib/codes");
const rateLimit = require("../lib/rateLimit");
const { badRequest, conflict, unauthorized, tooMany } = require("../lib/http");
const { selfPlayer, invalidatePlayer } = require("../services/players");
const { getLiveEvent, ensureJoined } = require("../services/events");

const router = express.Router();

const NAME_RE = /^[\p{L}\p{N} _.-]{2,20}$/u;
const RESERVED = new Set(["admin", "administrador", "staff", "gdg", "gdgarequipa", "bingo", "soporte"]);

function nameKeyOf(name) {
  return name.normalize("NFC").toLowerCase();
}

function validateName(raw) {
  const name = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ").normalize("NFC") : "";
  if (!NAME_RE.test(name)) throw badRequest("El nombre debe tener 2 a 20 letras o numeros");
  if (RESERVED.has(nameKeyOf(name))) throw badRequest("Ese nombre esta reservado, usa otro");
  return name;
}

/**
 * Inscribe al jugador en el evento abierto. No es critico: si falla, /api/me
 * lo reintenta. Lo que NO puede pasar es que un fallo aqui convierta un
 * registro exitoso en un error para el celular.
 */
async function joinLiveEvent(playerId) {
  try {
    const event = await getLiveEvent();
    if (event) await ensureJoined(event.id, playerId);
  } catch (error) {
    console.error("auth: no se pudo inscribir en el evento (se reintentara):", error.message);
  }
}

router.get("/name/:name", async (req, res) => {
  let name;
  try {
    name = validateName(req.params.name);
  } catch (error) {
    return res.json({ available: false, reason: error.message });
  }
  const taken = await prisma.player.findUnique({
    where: { nameKey: nameKeyOf(name) },
    select: { id: true },
  });
  res.json({ available: !taken, reason: taken ? "Ese nombre ya esta tomado" : null });
});

router.post("/register", async (req, res) => {
  // En un evento cientos de personas comparten la IP del WiFi: este limite es
  // solo un freno anti-spam muy holgado, jamas debe bloquear la fila de entrada.
  const ipLimit = rateLimit.hit(`register:${req.ip}`, 3000, 10 * 60_000);
  if (!ipLimit.ok) throw tooMany("Demasiados registros desde esta red", ipLimit.retryAfterMs);

  const name = validateName(req.body?.name);
  const pin = String(req.body?.pin ?? "");
  if (!isValidPin(pin)) throw badRequest("El PIN debe tener de 4 a 8 digitos");

  const pinHash = await hashPin(pin);

  let player = null;
  for (let attempt = 0; attempt < 5 && !player; attempt += 1) {
    try {
      player = await prisma.player.create({
        data: { name, nameKey: nameKeyOf(name), pinHash, code: newPlayerCode() },
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const exists = await prisma.player.findUnique({
        where: { nameKey: nameKeyOf(name) },
        select: { id: true },
      });
      if (exists) throw conflict("Ese nombre ya existe. Si es tuyo, entra con tu PIN");
      // si no, fue colision del codigo: se reintenta
    }
  }
  if (!player) throw conflict("No se pudo crear tu cuenta, intenta de nuevo");

  await joinLiveEvent(player.id);
  issueSession(res, player);
  res.status(201).json({ player: selfPlayer(player) });
});

router.post("/login", async (req, res) => {
  const rawName = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const pin = String(req.body?.pin ?? "");
  if (!rawName || !pin) throw badRequest("Escribe tu nombre y tu PIN");

  const key = nameKeyOf(rawName.replace(/\s+/g, " "));
  // La defensa real contra adivinar PINs es por nombre: 6 fallos y esa cuenta
  // queda en pausa 10 minutos, venga de donde venga el intento.
  const nameLock = rateLimit.peek(`login:name:${key}`, 6);
  if (!nameLock.ok) {
    throw tooMany("Demasiados intentos con ese nombre. Espera unos minutos o pide ayuda al staff", nameLock.retryAfterMs);
  }
  const ipLimit = rateLimit.peek(`login:ip:${req.ip}`, 2000);
  if (!ipLimit.ok) throw tooMany("Demasiados intentos desde esta red", ipLimit.retryAfterMs);

  const player = await prisma.player.findUnique({ where: { nameKey: key } });
  const valid = player ? await verifyPin(pin, player.pinHash) : false;

  if (!valid) {
    rateLimit.hit(`login:name:${key}`, 6, 10 * 60_000);
    rateLimit.hit(`login:ip:${req.ip}`, 2000, 10 * 60_000);
    throw unauthorized("Nombre o PIN incorrectos");
  }

  rateLimit.reset(`login:name:${key}`);
  invalidatePlayer(player.id);
  await joinLiveEvent(player.id);
  issueSession(res, player);
  res.json({ player: selfPlayer(player) });
});

router.post("/logout", (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

module.exports = router;
