/**
 * Limitador en memoria de ventana fija. Suficiente para un solo proceso;
 * se reinicia si el servidor se reinicia, lo cual es aceptable para frenar
 * fuerza bruta de PINs y de codigos durante un evento.
 */
const buckets = new Map();

function hit(key, limit, windowMs) {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  return {
    ok: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterMs: Math.max(0, bucket.resetAt - now),
  };
}

function peek(key, limit) {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= Date.now()) return { ok: true, retryAfterMs: 0 };
  return {
    ok: bucket.count < limit,
    retryAfterMs: Math.max(0, bucket.resetAt - Date.now()),
  };
}

function reset(key) {
  buckets.delete(key);
}

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 60_000).unref();

module.exports = { hit, peek, reset };
