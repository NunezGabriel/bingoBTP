const { Prisma } = require("../lib/prisma");
const hub = require("../realtime/hub");
const { invalidatePlayer } = require("./players");

/**
 * Entrega puntos dentro de una transaccion. Es la unica puerta de entrada de
 * puntos a todo el sistema.
 *
 * - Idempotente: el libro tiene clave unica (evento, jugador, refKey). Si una
 *   recompensa ya se cobro, se ignora en silencio (ON CONFLICT DO NOTHING).
 * - En lote y con 2 viajes a la base sin importar a cuanta gente se premie:
 *   contra una base remota cada viaje cuesta ~100 ms.
 *
 * @param entries [{ playerId, amount, refKey, label }]
 * @returns resultados por jugador con su nuevo total.
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

  // 2) Libro de puntos + total del evento en una sola sentencia.
  //    "now() AT TIME ZONE 'UTC'": las columnas son timestamp sin zona en UTC;
  //    usar la hora de la sesion romperia el desempate si el servidor usa otra zona.
  const rows = entries.map(
    (e) =>
      Prisma.sql`(${e.playerId}::int, ${e.amount}::int, ${e.refKey}::text, ${e.label.slice(0, 120)}::text)`,
  );
  const [result] = await tx.$queryRaw`
    WITH input (pid, amount, ref_key, label) AS (
      VALUES ${Prisma.join(rows)}
    ),
    ins AS (
      INSERT INTO "PointLedger" ("eventId", "playerId", amount, "refKey", label, "createdAt")
      SELECT ${eventId}::int, pid, amount, ref_key, label, now() AT TIME ZONE 'UTC'
      FROM input
      ON CONFLICT ("eventId", "playerId", "refKey") DO NOTHING
      RETURNING "playerId", amount, label
    ),
    totals AS (
      SELECT "playerId" AS pid, SUM(amount)::int AS amount FROM ins GROUP BY "playerId"
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
      COALESCE((SELECT json_agg(json_build_object('playerId', "playerId", 'amount', amount, 'label', label)) FROM ins), '[]'::json) AS inserted,
      COALESCE((SELECT json_agg(json_build_object('playerId', "playerId", 'points', points)) FROM ep), '[]'::json) AS points`;

  const inserted = result.inserted;
  if (!inserted.length) return [];

  const pointsById = new Map(result.points.map((r) => [r.playerId, r.points]));
  const totals = new Map();
  for (const row of inserted) {
    totals.set(row.playerId, (totals.get(row.playerId) ?? 0) + row.amount);
  }

  return [...totals].map(([playerId, amount]) => ({
    playerId,
    amount,
    points: pointsById.get(playerId) ?? 0,
    entries: inserted.filter((row) => row.playerId === playerId),
  }));
}

/**
 * Avisa los puntos ya confirmados al celular de cada jugador y marca el
 * ranking como cambiado. Llamar SIEMPRE despues del commit.
 */
function announceGrants(eventId, results) {
  if (!results.length) return;
  invalidatePlayer(results.map((r) => r.playerId));

  for (const r of results) {
    for (const entry of r.entries) {
      hub.toPlayer(r.playerId, "points", {
        amount: entry.amount,
        label: entry.label,
        points: r.points,
      });
    }
  }
}

module.exports = { grant, announceGrants };
