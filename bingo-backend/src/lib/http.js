/**
 * Error con status HTTP. Express 5 propaga los rechazos de promesas al
 * manejador global, asi que basta con lanzarlo desde cualquier ruta.
 */
class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

const badRequest = (msg, extra) => new HttpError(400, msg, extra);
const unauthorized = (msg = "Inicia sesion para continuar") =>
  new HttpError(401, msg);
const forbidden = (msg = "No tienes permiso para esto") =>
  new HttpError(403, msg);
const notFound = (msg = "No encontrado") => new HttpError(404, msg);
const conflict = (msg, extra) => new HttpError(409, msg, extra);
const tooMany = (msg, retryAfterMs) =>
  new HttpError(429, msg, { retryAfterMs });

function toInt(value, name, { min, max } = {}) {
  const n = Number(value);
  if (!Number.isInteger(n)) throw badRequest(`${name} debe ser un numero entero`);
  if (min !== undefined && n < min) throw badRequest(`${name} debe ser >= ${min}`);
  if (max !== undefined && n > max) throw badRequest(`${name} debe ser <= ${max}`);
  return n;
}

function toText(value, name, { min = 0, max = 500, optional = false } = {}) {
  if (value === undefined || value === null) {
    if (optional) return undefined;
    throw badRequest(`${name} es obligatorio`);
  }
  const s = String(value).trim();
  if (s.length < min) throw badRequest(`${name} es muy corto`);
  if (s.length > max) throw badRequest(`${name} es muy largo (max ${max})`);
  return s;
}

function toBool(value) {
  return value === true || value === "true" || value === 1;
}

module.exports = {
  HttpError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  tooMany,
  toInt,
  toText,
  toBool,
};
