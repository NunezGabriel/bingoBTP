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

/**
 * Nombres que no se aceptan al crear una cuenta.
 *
 * El nombre se pasea sobre la cabeza de cada quien en la plaza y sale en la
 * pantalla del auditorio, asi que uno ofensivo lo ve todo el evento. Esto no
 * pretende ser exhaustivo -quien insista se las ingenia igual-: frena al que
 * lo intenta de pasada, y al resto lo borra el staff desde el panel.
 *
 * Van en dos listas porque el riesgo no es el mismo. Una palabra corta buscada
 * a ciegas dentro del nombre se lleva por delante a gente inocente: "computo"
 * lleva "puto" dentro y "maricarmen" lleva "marica", y en un evento de
 * programadores los dos son nombres perfectamente normales.
 */
/** Inequivocas: ninguna cabe dentro de un nombre real, se buscan como trozo. */
const OFENSIVAS_TROZO = [
  "mierda",
  "pendejo",
  "pendeja",
  "cabron",
  "maricon",
  "conchatumadre",
  "ctmr",
  "culiao",
  "chucha",
  "pinche",
  "chingada",
  "chingar",
  "huevon",
  "webon",
  "malparido",
  "gonorrea",
  "hijueputa",
  "violador",
  "hitler",
  "nazi",
  "fuck",
  "bitch",
  "nigg",
  "faggot",
  "whore",
];
/**
 * Ambiguas: solo si son el nombre entero o una palabra suelta dentro de el.
 * Las de ingles estan aqui por lo mismo que las de espanol: "shitake" lleva
 * "shit" y "therapist" lleva "rapist".
 */
const OFENSIVAS_PALABRA = [
  "puta",
  "puto",
  "marica",
  "verga",
  "zorra",
  "hdp",
  "shit",
  "cunt",
  "rapist",
];

function nameKeyOf(name) {
  return name.normalize("NFC").toLowerCase();
}

function esOfensivo(key) {
  // Sin espacios ni puntos, asi "p.u.t.o" se mira igual que "puto".
  const plano = key.replace(/[^\p{L}\p{N}]/gu, "");
  if (OFENSIVAS_TROZO.some((mala) => plano.includes(mala))) return true;
  if (OFENSIVAS_PALABRA.includes(plano)) return true;
  const palabras = key.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return palabras.some((p) => OFENSIVAS_PALABRA.includes(p));
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
      // Este mensaje le sale a dos personas muy distintas: a quien se equivoco
      // de clave, y a quien se esta registrando por primera vez con un nombre
      // que otro ya tomo. En un evento de cientos el segundo caso es el comun
      // -"juan", "maria"- y con "clave incorrecta" a secas creia que la app
      // estaba rota y lo reintentaba hasta quedar bloqueado diez minutos.
      throw unauthorized(
        "Clave incorrecta. Si es tu primera vez, ese usuario ya esta tomado: agrega tu apellido",
      );
    }
    rateLimit.reset(`entrar:name:${key}`);
    invalidatePlayer(existing.id);
    if (existing.role === "PLAYER") await joinLiveEvent(existing.id);
    issueSession(res, existing);
    return res.json({ player: selfPlayer(existing), nuevo: false });
  }

  // Cuenta nueva.
  if (RESERVED.has(key)) throw badRequest("Ese usuario esta reservado, usa otro");
  if (esOfensivo(key)) throw badRequest("Ese usuario no se puede usar, elige otro");
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
