const crypto = require("node:crypto");
const config = require("../config");

/**
 * Sesiones en cookie firmada (HMAC-SHA256), sin tabla en la base de datos.
 *
 * Hay una sola sesion: { p: playerId, v: sessionVersion, t: emitida }. El rol
 * (jugador o admin) no viaja en la cookie, se lee de la base en cada peticion:
 * asi quitarle el admin a alguien tiene efecto inmediato. Cambiar la clave sube
 * sessionVersion y deja invalidas las cookies anteriores.
 *
 * El ticket es aparte: un permiso de un minuto para abrir el WebSocket del
 * lobby, porque el navegador no manda cookies de otro dominio en un WebSocket.
 */

const REFRESH_AFTER_MS = 1000 * 60 * 60 * 24 * 2;

function sign(payload) {
  return crypto.createHmac("sha256", config.sessionSecret).update(payload).digest("base64url");
}

function encode(data) {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decode(value, maxAgeMs) {
  if (typeof value !== "string") return null;
  const dot = value.indexOf(".");
  if (dot <= 0) return null;
  const payload = value.slice(0, dot);
  const signature = value.slice(dot + 1);
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (Date.now() - data.t > maxAgeMs) return null;
    return data;
  } catch {
    return null;
  }
}

function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return undefined;
}

function cookieOptions(maxAge) {
  return {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    maxAge,
    path: "/",
  };
}

function issueSession(res, player) {
  res.cookie(
    config.cookie.name,
    encode({ p: player.id, v: player.sessionVersion, t: Date.now() }),
    cookieOptions(config.cookie.maxAgeMs),
  );
}

function readSession(req) {
  const data = decode(readCookie(req, config.cookie.name), config.cookie.maxAgeMs);
  return data && Number.isInteger(data.p) && Number.isInteger(data.v) ? data : null;
}

function clearSession(res) {
  const { maxAge, ...opts } = cookieOptions(0);
  res.clearCookie(config.cookie.name, opts);
}

function shouldRefresh(session) {
  return Date.now() - session.t > REFRESH_AFTER_MS;
}

/* ---------- Ticket del lobby ---------- */

function issueTicket(player) {
  return encode({ p: player.id, v: player.sessionVersion, t: Date.now() });
}

function readTicket(value) {
  const data = decode(value, config.lobby.ticketMaxAgeMs);
  return data && Number.isInteger(data.p) && Number.isInteger(data.v) ? data : null;
}

module.exports = {
  issueSession,
  readSession,
  clearSession,
  shouldRefresh,
  issueTicket,
  readTicket,
};
