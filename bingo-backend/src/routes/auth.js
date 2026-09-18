const express = require("express");
const { prisma, isUniqueViolation } = require("../lib/prisma");
const { hashPin, verifyPin, isValidPin } = require("../lib/pin");
const { issueSession, clearSession } = require("../lib/session");
const { newPlayerCode } = require("../lib/codes");
const rateLimit = require("../lib/rateLimit");
const { badRequest, conflict, unauthorized, tooMany } = require("../lib/http");
const { CLASSES, HOUSES, isClassUnlocked } = require("../lib/progression");
const { selfPlayer, invalidatePlayer } = require("../services/players");
const { getLiveEvent, ensureJoined } = require("../services/events");

const router = express.Router();

const NICKNAME_RE = /^[\p{L}\p{N}_]{3,16}$/u;
const RESERVED = new Set([
  "admin",
  "administrador",
  "staff",
  "gdg",
  "gdgarequipa",
  "moderador",
  "soporte",
  "sistema",
  "misti",
  "mistiquest",
]);

function nicknameKey(nickname) {
  return nickname.normalize("NFC").toLowerCase();
}

function validateNickname(raw) {
  const nickname = typeof raw === "string" ? raw.trim().normalize("NFC") : "";
  if (!NICKNAME_RE.test(nickname)) {
    throw badRequest("El nombre debe tener 3 a 16 letras, numeros o _");
  }
  if (RESERVED.has(nicknameKey(nickname))) {
    throw badRequest("Ese nombre esta reservado, elige otro");
  }
  return nickname;
}

/**
 * Inscribe al jugador en el evento en curso. No es critico: si falla, /api/me
 * lo reintenta en la siguiente peticion. Lo que NO puede pasar es que un fallo
 * aqui convierta un registro exitoso en un "error" para el celular.
 */
async function joinLiveEvent(playerId) {
  try {
    const event = await getLiveEvent();
    if (event) await ensureJoined(event.id, playerId);
  } catch (error) {
    console.error("auth: no se pudo inscribir en el evento (se reintentara):", error.message);
  }
}

router.get("/nickname/:nickname", async (req, res) => {
  let nickname;
  try {
    nickname = validateNickname(req.params.nickname);
  } catch (error) {
    return res.json({ available: false, reason: error.message });
  }
  const taken = await prisma.player.findUnique({
    where: { nicknameKey: nicknameKey(nickname) },
    select: { id: true },
  });
  res.json({ available: !taken, reason: taken ? "Ese nombre ya existe" : null });
});

router.post("/register", async (req, res) => {
  // En un evento cientos de personas comparten la IP publica del WiFi, y detras
  // de proxies (Vercel -> Render) req.ip puede ser la misma para TODOS. Por eso
  // este limite es solo un freno anti-spam muy holgado: jamas debe bloquear la
  // fila de la entrada.
  const ipLimit = rateLimit.hit(`register:${req.ip}`, 3000, 10 * 60_000);
  if (!ipLimit.ok) throw tooMany("Demasiados registros desde esta red", ipLimit.retryAfterMs);

  const nickname = validateNickname(req.body?.nickname);
  const pin = String(req.body?.pin ?? "");
  const avatarClass = String(req.body?.avatarClass ?? "");
  const avatarHouse = String(req.body?.avatarHouse ?? "");

  if (!isValidPin(pin)) throw badRequest("El PIN debe tener de 4 a 8 digitos");
  if (!CLASSES.includes(avatarClass) || !isClassUnlocked(avatarClass, 1)) {
    throw badRequest("Clase de personaje no disponible");
  }
  if (!HOUSES.includes(avatarHouse)) throw badRequest("Casa invalida");

  const pinHash = await hashPin(pin);

  let player = null;
  for (let attempt = 0; attempt < 5 && !player; attempt += 1) {
    try {
      player = await prisma.player.create({
        data: {
          nickname,
          nicknameKey: nicknameKey(nickname),
          pinHash,
          avatarClass,
          avatarHouse,
          code: newPlayerCode(),
        },
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const exists = await prisma.player.findUnique({
        where: { nicknameKey: nicknameKey(nickname) },
        select: { id: true },
      });
      if (exists) throw conflict("Ese nombre ya existe. Si es tuyo, entra con tu PIN");
      // si no, fue colision del codigo publico: se reintenta
    }
  }
  if (!player) throw conflict("No se pudo crear el personaje, intenta de nuevo");

  await joinLiveEvent(player.id);
  issueSession(res, player);
  res.status(201).json({ player: selfPlayer(player) });
});

router.post("/login", async (req, res) => {
  const rawNickname = typeof req.body?.nickname === "string" ? req.body.nickname.trim() : "";
  const pin = String(req.body?.pin ?? "");
  if (!rawNickname || !pin) throw badRequest("Escribe tu nombre y tu PIN");

  const key = nicknameKey(rawNickname);
  // La defensa real contra adivinar PINs es por nombre: 6 fallos y esa cuenta
  // queda en pausa 10 minutos, venga de donde venga el ataque.
  const nickLock = rateLimit.peek(`login:nick:${key}`, 6);
  if (!nickLock.ok) {
    throw tooMany(
      "Demasiados intentos con ese nombre. Espera unos minutos o pide ayuda al staff",
      nickLock.retryAfterMs,
    );
  }
  // Por IP solo se frena un barrido masivo de muchas cuentas; es holgado
  // porque toda la gente del evento puede compartir IP.
  const ipLimit = rateLimit.peek(`login:ip:${req.ip}`, 2000);
  if (!ipLimit.ok) throw tooMany("Demasiados intentos desde esta red", ipLimit.retryAfterMs);

  const player = await prisma.player.findUnique({ where: { nicknameKey: key } });
  const valid = player ? await verifyPin(pin, player.pinHash) : false;

  if (!valid) {
    rateLimit.hit(`login:nick:${key}`, 6, 10 * 60_000);
    rateLimit.hit(`login:ip:${req.ip}`, 2000, 10 * 60_000);
    throw unauthorized("Nombre o PIN incorrectos");
  }

  rateLimit.reset(`login:nick:${key}`);
  invalidatePlayer(player.id);
  await joinLiveEvent(player.id);
  issueSession(res, player);
  res.json({ player: selfPlayer(player) });
});

router.post("/logout", (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

module.exports = { router, nicknameKey, validateNickname };
