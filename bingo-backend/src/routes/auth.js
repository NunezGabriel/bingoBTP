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
/** Nombres que nadie puede crearse. La cuenta de admin ya existe y entra igual. */
const RESERVED = new Set([
  "admin",
  "administrador",
  "staff",
  "gdg",
  "gdgarequipa",
  "bingo",
  "soporte",
  "organizador",
]);

function nameKeyOf(name) {
  return name.normalize("NFC").toLowerCase();
}

function cleanName(raw) {
  return typeof raw === "string" ? raw.trim().replace(/\s+/g, " ").normalize("NFC") : "";
}

/**
 * Inscribe al jugador en el evento abierto. No es critico: si falla, /api/me
 * lo reintenta. Lo que NO puede pasar es que un fallo aqui convierta una
 * entrada exitosa en un error para el celular.
 */
async function joinLiveEvent(playerId) {
  try {
    const event = await getLiveEvent();
    if (event) await ensureJoined(event.id, playerId);
  } catch (error) {
    console.error("auth: no se pudo inscribir en el evento (se reintentara):", error.message);
  }
}

/**
 * Una sola puerta: escribes usuario y clave. Si el usuario no existe se crea
 * la cuenta ahi mismo; si existe, se valida la clave. Es lo mas corto posible
 * sin perder la identidad, que hace falta porque hay premios de por medio.
 */
router.post("/entrar", async (req, res) => {
  const name = cleanName(req.body?.usuario ?? req.body?.name);
  const clave = String(req.body?.clave ?? req.body?.pin ?? "");
  if (!name || !clave) throw badRequest("Escribe tu usuario y tu clave");
  if (!NAME_RE.test(name)) throw badRequest("El usuario debe tener de 2 a 20 letras o numeros");

  const key = nameKeyOf(name);
  // La defensa real contra adivinar claves es por usuario: 6 fallos y esa
  // cuenta queda en pausa 10 minutos, venga de donde venga el intento.
  const nameLock = rateLimit.peek(`entrar:name:${key}`, 6);
  if (!nameLock.ok) {
    throw tooMany(
      "Demasiados intentos con ese usuario. Espera unos minutos o pide ayuda al staff",
      nameLock.retryAfterMs,
    );
  }
  // En un evento cientos de personas comparten la IP del WiFi: este limite es
  // solo un freno anti-spam muy holgado, jamas debe frenar la fila de entrada.
  const ipLimit = rateLimit.peek(`entrar:ip:${req.ip}`, 3000);
  if (!ipLimit.ok) throw tooMany("Demasiados intentos desde esta red", ipLimit.retryAfterMs);

  const existing = await prisma.player.findUnique({ where: { nameKey: key } });

  if (existing) {
    const valid = await verifyPin(clave, existing.claveHash);
    if (!valid) {
      rateLimit.hit(`entrar:name:${key}`, 6, 10 * 60_000);
      rateLimit.hit(`entrar:ip:${req.ip}`, 3000, 10 * 60_000);
      throw unauthorized("Usuario o clave incorrectos");
    }
    rateLimit.reset(`entrar:name:${key}`);
    invalidatePlayer(existing.id);
    if (existing.role === "PLAYER") await joinLiveEvent(existing.id);
    issueSession(res, existing);
    return res.json({ player: selfPlayer(existing), nuevo: false });
  }

  // Cuenta nueva.
  if (RESERVED.has(key)) throw badRequest("Ese usuario esta reservado, usa otro");
  if (!isValidPin(clave)) throw badRequest("Tu clave debe ser de 4 a 8 numeros");

  const claveHash = await hashPin(clave);
  let player = null;
  for (let attempt = 0; attempt < 5 && !player; attempt += 1) {
    try {
      player = await prisma.player.create({
        data: { name, nameKey: key, claveHash, code: newPlayerCode() },
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const taken = await prisma.player.findUnique({ where: { nameKey: key }, select: { id: true } });
      // Dos personas escribiendo el mismo usuario a la vez: la segunda entra
      // por la puerta de siempre, con su clave.
      if (taken) throw conflict("Ese usuario se acaba de crear. Vuelve a intentar con tu clave");
      // si no, fue colision del codigo de 6 letras: se reintenta
    }
  }
  if (!player) throw conflict("No se pudo crear tu cuenta, intenta de nuevo");

  await joinLiveEvent(player.id);
  issueSession(res, player);
  res.status(201).json({ player: selfPlayer(player), nuevo: true });
});

router.post("/salir", (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

module.exports = router;
