const crypto = require("node:crypto");
const config = require("../config");

/**
 * Sesion en cookie firmada (HMAC-SHA256), sin tabla en la base de datos.
 *
 * La version anterior guardaba la sesion en Postgres: cada peticion pagaba una
 * consulta extra (~110 ms contra Neon). Con cientos de jugadores eso se nota.
 * Aqui la cookie lleva { p: playerId, v: sessionVersion, t: emitida } y la
 * firma impide falsificarla. Cambiar el PIN sube sessionVersion y deja
 * invalidas todas las cookies anteriores.
 */

const REFRESH_AFTER_MS = 1000 * 60 * 60 * 24 * 7;

function sign(payload) {
  return crypto
    .createHmac("sha256", config.sessionSecret)
    .update(payload)
    .digest("base64url");
}

function encode(data) {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decode(value) {
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
    if (!Number.isInteger(data.p) || !Number.isInteger(data.v)) return null;
    if (Date.now() - data.t > config.cookie.maxAgeMs) return null;
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

function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    maxAge: config.cookie.maxAgeMs,
    path: "/",
  };
}

function issueSession(res, player) {
  res.cookie(
    config.cookie.name,
    encode({ p: player.id, v: player.sessionVersion, t: Date.now() }),
    cookieOptions(),
  );
}

function readSession(req) {
  return decode(readCookie(req, config.cookie.name));
}

function clearSession(res) {
  const { maxAge, ...opts } = cookieOptions();
  res.clearCookie(config.cookie.name, opts);
}

function shouldRefresh(session) {
  return Date.now() - session.t > REFRESH_AFTER_MS;
}

module.exports = { issueSession, readSession, clearSession, shouldRefresh };
