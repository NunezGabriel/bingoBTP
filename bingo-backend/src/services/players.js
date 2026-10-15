const { prisma } = require("../lib/prisma");

/** Lo minimo para mostrar a alguien en el ranking, el lobby o una casilla firmada. */
function publicPlayer(p) {
  if (!p) return null;
  return { id: p.id, name: p.name, skin: p.skin ?? null };
}

function selfPlayer(p) {
  return {
    id: p.id,
    name: p.name,
    code: p.code,
    role: p.role,
    skin: p.skin ?? null,
    createdAt: p.createdAt,
  };
}

const PUBLIC_SELECT = { id: true, name: true, skin: true };

// Cache corto por proceso: cada peticion autenticada necesita al jugador, y
// contra una base remota eso son ~100 ms por peticion si no se cachea.
const CACHE_TTL_MS = 10_000;
const cache = new Map();
const inflight = new Map();

async function getPlayer(id) {
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.player;
  if (inflight.has(id)) return inflight.get(id);

  const promise = prisma.player
    .findUnique({ where: { id } })
    .then((player) => {
      cache.set(id, { at: Date.now(), player });
      return player;
    })
    .finally(() => inflight.delete(id));
  inflight.set(id, promise);
  return promise;
}

function invalidatePlayer(...ids) {
  for (const id of ids.flat()) cache.delete(id);
}

function findByCode(code) {
  return prisma.player.findUnique({ where: { code } });
}

setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of cache) {
    if (now - entry.at > CACHE_TTL_MS) cache.delete(id);
  }
}, 60_000).unref();

module.exports = { PUBLIC_SELECT, publicPlayer, selfPlayer, getPlayer, invalidatePlayer, findByCode };
