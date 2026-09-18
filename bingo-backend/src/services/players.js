const { prisma } = require("../lib/prisma");
const { progressFor } = require("../lib/progression");

/** Campos minimos para mostrar a un jugador a otros (ranking, contactos...). */
const PUBLIC_SELECT = {
  id: true,
  nickname: true,
  avatarClass: true,
  avatarHouse: true,
  xp: true,
};

function publicPlayer(p) {
  if (!p) return null;
  const prog = progressFor(p.xp);
  return {
    id: p.id,
    nickname: p.nickname,
    avatarClass: p.avatarClass,
    avatarHouse: p.avatarHouse,
    level: prog.level,
    tier: prog.tier,
    title: prog.title,
  };
}

function selfPlayer(p) {
  return {
    ...publicPlayer(p),
    code: p.code,
    role: p.role,
    progress: progressFor(p.xp),
    createdAt: p.createdAt,
  };
}

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

async function findByCode(code) {
  return prisma.player.findUnique({ where: { code } });
}

setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of cache) {
    if (now - entry.at > CACHE_TTL_MS) cache.delete(id);
  }
}, 60_000).unref();

module.exports = {
  PUBLIC_SELECT,
  publicPlayer,
  selfPlayer,
  getPlayer,
  invalidatePlayer,
  findByCode,
};
