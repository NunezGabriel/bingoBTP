const { Prisma } = require("../lib/prisma");
const { levelFromXp, progressFor } = require("../lib/progression");
const hub = require("../realtime/hub");
const { invalidatePlayer } = require("./players");
const { leaderboardChanged } = require("./leaderboard");

/**
 * Entrega puntos dentro de una transaccion. Es la unica puerta de entrada de
 * puntos a todo el sistema.
 *
 * - Idempotente: el libro contable tiene clave unica (evento, jugador, refKey).
 *   Si una recompensa ya se cobro, se ignora en silencio (ON CONFLICT DO NOTHING).
 * - En lote y con 2 viajes a la base sin importar a cuantos jugadores se premie.
 *   Contra una base remota cada viaje cuesta ~100 ms y retiene una conexion,
 *   asi que el numero de viajes ES la capacidad del servidor.
 *
 * @param entries [{ playerId, amount, source, refKey, label, awardedById? }]
 * @returns resultados por jugador con totales y cambio de nivel.
 */
async function grant(tx, eventId, entries) {
  if (!entries.length) return [];

  // 1) La fila de participacion casi siempre existe (se crea al entrar), pero
  //    se asegura antes para que la sentencia 2 pueda hacer un UPDATE simple.
  const playerIds = [...new Set(entries.map((e) => e.playerId))];
  await tx.$executeRaw`
    INSERT INTO "EventPlayer" ("eventId", "playerId", "joinedAt")
    SELECT ${eventId}::int, pid, now() AT TIME ZONE 'UTC'
    FROM unnest(${playerIds}::int[]) AS pid
    ON CONFLICT ("eventId", "playerId") DO NOTHING`;

  // 2) Libro contable + XP de por vida + puntos del evento en una sola sentencia.
  //    "now() AT TIME ZONE 'UTC'": las columnas son timestamp sin zona en UTC;
  //    usar la hora de la sesion romperia el desempate si el servidor usa otra zona.
  const rows = entries.map(
    (e) =>
      Prisma.sql`(${e.playerId}::int, ${e.amount}::int, ${e.source}::text, ${e.refKey}::text, ${e.label.slice(0, 120)}::text, ${e.awardedById ?? null}::int)`,
  );
  const [result] = await tx.$queryRaw`
    WITH input (pid, amount, source, ref_key, label, awarded_by) AS (
      VALUES ${Prisma.join(rows)}
    ),
    ins AS (
      INSERT INTO "PointLedger" ("eventId", "playerId", amount, source, "refKey", label, "awardedById", "createdAt")
      SELECT ${eventId}::int, pid, amount, source::"PointSource", ref_key, label, awarded_by, now() AT TIME ZONE 'UTC'
      FROM input
      ON CONFLICT ("eventId", "playerId", "refKey") DO NOTHING
      RETURNING "playerId", amount, source::text AS source, label
    ),
    totals AS (
      SELECT "playerId" AS pid, SUM(amount)::int AS amount FROM ins GROUP BY "playerId"
    ),
    xp AS (
      UPDATE "Player" AS p SET xp = GREATEST(0, p.xp + t.amount)
      FROM totals t WHERE p.id = t.pid
      RETURNING p.id, p.xp
    ),
    ep AS (
      UPDATE "EventPlayer" AS ep
      SET points = GREATEST(0, ep.points + t.amount),
          "lastScoredAt" = now() AT TIME ZONE 'UTC'
      FROM totals t
      WHERE ep."eventId" = ${eventId}::int AND ep."playerId" = t.pid
      RETURNING ep."playerId", ep.points
    )
    SELECT
      COALESCE((SELECT json_agg(json_build_object('playerId', "playerId", 'amount', amount, 'source', source, 'label', label)) FROM ins), '[]'::json) AS inserted,
      COALESCE((SELECT json_agg(json_build_object('id', id, 'xp', xp)) FROM xp), '[]'::json) AS xp,
      COALESCE((SELECT json_agg(json_build_object('playerId', "playerId", 'points', points)) FROM ep), '[]'::json) AS points`;

  const inserted = result.inserted;
  if (!inserted.length) return [];

  const xpById = new Map(result.xp.map((r) => [r.id, r.xp]));
  const pointsById = new Map(result.points.map((r) => [r.playerId, r.points]));
  const totals = new Map();
  for (const row of inserted) {
    totals.set(row.playerId, (totals.get(row.playerId) ?? 0) + row.amount);
  }

  return [...totals].map(([playerId, amount]) => {
    const xp = xpById.get(playerId) ?? 0;
    return {
      playerId,
      amount,
      xp,
      points: pointsById.get(playerId) ?? 0,
      levelBefore: levelFromXp(Math.max(0, xp - amount)),
      levelAfter: levelFromXp(xp),
      entries: inserted.filter((row) => row.playerId === playerId),
    };
  });
}

/**
 * Notifica los puntos ya confirmados: aviso al jugador, subida de nivel y
 * ranking. Llamar SIEMPRE despues del commit.
 */
async function announceGrants(eventId, results) {
  if (!results.length) return;
  invalidatePlayer(results.map((r) => r.playerId));

  for (const r of results) {
    for (const entry of r.entries) {
      hub.toPlayer(r.playerId, "points", {
        amount: entry.amount,
        label: entry.label,
        source: entry.source,
        points: r.points,
        xp: r.xp,
        level: r.levelAfter,
      });
    }
    if (r.levelAfter > r.levelBefore) {
      hub.toPlayer(r.playerId, "levelup", progressFor(r.xp));
    }
  }

  leaderboardChanged(eventId);
}

module.exports = { grant, announceGrants };
