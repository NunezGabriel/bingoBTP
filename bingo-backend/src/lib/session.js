const crypto = require("node:crypto");
const config = require("../config");

/**
 * Sesiones en cookie firmada (HMAC-SHA256), sin tabla en la base de datos.
 *
 * - Jugador: { p: playerId, v: sessionVersion, t: emitida }. Cambiar el PIN
 *   sube sessionVersion y deja invalidas las cookies anteriores.
 * - Admin:   { a: 1, t: emitida }. Se emite al escribir el codigo del panel.
 */

const REFRESH_AFTER_MS = 1000 * 60 * 60 * 24 * 7;

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

/* ---------- Jugador ---------- */

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

/* ---------- Admin ---------- */

function issueAdmin(res) {
  res.cookie(
    config.cookie.adminName,
    encode({ a: 1, t: Date.now() }),
    cookieOptions(config.cookie.adminMaxAgeMs),
  );
}

function readAdmin(req) {
  const data = decode(readCookie(req, config.cookie.adminName), config.cookie.adminMaxAgeMs);
  return data?.a === 1;
}

function clearAdmin(res) {
  const { maxAge, ...opts } = cookieOptions(0);
  res.clearCookie(config.cookie.adminName, opts);
}

module.exports = {
  issueSession,
  readSession,
  clearSession,
  shouldRefresh,
  issueAdmin,
  readAdmin,
  clearAdmin,
};
