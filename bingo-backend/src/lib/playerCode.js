const rateLimit = require("./rateLimit");
const { normalizeCode, CODE_LENGTH } = require("./codes");
const { badRequest, notFound, tooMany } = require("./http");
const { findByCode } = require("../services/players");

const MAX_FAILS = 20;
const WINDOW_MS = 5 * 60_000;

/**
 * Busca a un jugador por el codigo de 6 caracteres que alguien escribio.
 * Frena a quien prueba codigos al azar: 20 invalidos cada 5 minutos por
 * jugador. Los aciertos no cuentan, asi que alguien honesto nunca lo toca.
 */
async function resolvePlayerCode(req, rawCode, { allowSelf = false } = {}) {
  const key = `codes:${req.player.id}`;
  const status = rateLimit.peek(key, MAX_FAILS);
  if (!status.ok) {
    throw tooMany("Demasiados codigos invalidos. Espera un momento", status.retryAfterMs);
  }

  const code = normalizeCode(rawCode);
  if (code.length !== CODE_LENGTH.player) {
    rateLimit.hit(key, MAX_FAILS, WINDOW_MS);
    throw badRequest("El codigo tiene 6 caracteres (letras y numeros)");
  }

  const target = await findByCode(code);
  if (!target) {
    rateLimit.hit(key, MAX_FAILS, WINDOW_MS);
    throw notFound("No existe un jugador con ese codigo");
  }
  if (!allowSelf && target.id === req.player.id) {
    throw badRequest("Ese es tu propio codigo");
  }
  return target;
}

module.exports = { resolvePlayerCode };
