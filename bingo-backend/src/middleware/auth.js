const { readSession, issueSession, clearSession, shouldRefresh } = require("../lib/session");
const { unauthorized, forbidden, conflict } = require("../lib/http");
const { getPlayer } = require("../services/players");
const { getLiveEvent, ensureJoined } = require("../services/events");

/** Carga al jugador de la cookie (si hay). No bloquea: eso lo hacen los require*. */
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

function requirePlayer(req, res, next) {
  if (!req.player) throw unauthorized();
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    requirePlayer(req, res, () => {});
    if (!roles.includes(req.player.role)) throw forbidden();
    next();
  };
}

/** Exige un evento abierto y deja al jugador inscrito en el. */
async function requireLiveEvent(req, res, next) {
  const event = await getLiveEvent();
  if (!event) throw conflict("No hay un evento abierto ahora mismo");
  req.event = event;
  if (req.player) await ensureJoined(event.id, req.player.id);
  next();
}

/**
 * Proteccion CSRF barata: toda escritura debe traer la cabecera X-MQ.
 * Un formulario de otro sitio no puede agregar cabeceras sin pasar por CORS.
 */
function requireCsrfHeader(req, res, next) {
  const safe = req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS";
  if (!safe && req.get("x-mq") !== "1") throw forbidden("Peticion rechazada");
  next();
}

module.exports = {
  attachPlayer,
  requirePlayer,
  requireRole,
  requireLiveEvent,
  requireCsrfHeader,
};
