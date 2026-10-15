const { readSession, issueSession, clearSession, shouldRefresh } = require("../lib/session");
const { unauthorized, forbidden, conflict } = require("../lib/http");
const { getPlayer } = require("../services/players");
const { getLiveEvent, ensureJoined } = require("../services/events");

/** Carga a quien sea que venga en la cookie. No bloquea: eso lo hacen los require*. */
async function attachPlayer(req, res, next) {
  const session = readSession(req);
  if (!session) return next();

  const player = await getPlayer(session.p);
  if (!player || player.sessionVersion !== session.v) {
    clearSession(res);
    return next();
  }

  req.player = player;
  if (shouldRefresh(session)) issueSession(res, player);
  return next();
}

function requireSession(req, res, next) {
  if (!req.player) throw unauthorized();
  next();
}

/**
 * Solo jugadores. Un admin no juega: no tiene cartilla, ni lobby, ni misiones,
 * y es mejor decirselo claro que dejarle media app a medio funcionar.
 */
function requirePlayer(req, res, next) {
  if (!req.player) throw unauthorized();
  if (req.player.role === "ADMIN") throw forbidden("Esta cuenta es de administracion, no juega");
  next();
}

/** Solo el rol ADMIN, que se lee de la base en cada peticion. */
function requireAdmin(req, res, next) {
  if (!req.player) throw unauthorized("Entra con tu cuenta de admin");
  if (req.player.role !== "ADMIN") throw forbidden("No tienes permisos de administracion");
  next();
}

/** Exige un evento abierto y deja al jugador inscrito en el. */
async function requireLiveEvent(req, res, next) {
  const event = await getLiveEvent();
  if (!event) throw conflict("No hay un evento abierto ahora mismo");
  req.event = event;
  if (req.player && req.player.role === "PLAYER") await ensureJoined(event.id, req.player.id);
  next();
}

/**
 * Proteccion CSRF barata: toda escritura debe traer la cabecera X-BG.
 * Un formulario de otro sitio no puede agregar cabeceras sin pasar por CORS.
 */
function requireCsrfHeader(req, res, next) {
  const safe = req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS";
  if (!safe && req.get("x-bg") !== "1") throw forbidden("Peticion rechazada");
  next();
}

module.exports = {
  attachPlayer,
  requireSession,
  requirePlayer,
  requireAdmin,
  requireLiveEvent,
  requireCsrfHeader,
};
