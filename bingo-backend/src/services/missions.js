const { prisma, isUniqueViolation } = require("../lib/prisma");
const { withTx } = require("../lib/tx");
const { missions, bonusCompleta } = require("../content/missions");
const { conflict, notFound } = require("../lib/http");
const hub = require("../realtime/hub");
const { grant, announceGrants } = require("./points");
const { publicPlayer, findByCode, PUBLIC_SELECT } = require("./players");

/**
 * La tarjeta de misiones.
 *
 * El participante no marca nada: un admin valida escaneando su QR (o
 * escribiendo su codigo de 6 letras). Cada mision se valida una sola vez por
 * persona y evento, y eso lo garantiza el indice unico de la tabla, no una
 * comprobacion previa: asi dos admins escaneando a la vez no la cuentan doble.
 */

const BY_ID = new Map(missions.map((m) => [m.id, m]));
const TOTAL = missions.length;

function missionView(mission, claim) {
  return {
    id: mission.id,
    title: mission.title,
    detail: mission.detail,
    hint: mission.hint,
    icon: mission.icon,
    points: mission.points,
    done: Boolean(claim),
    doneAt: claim?.createdAt ?? null,
  };
}

function buildCard(claims) {
  const byMission = new Map(claims.map((c) => [c.missionId, c]));
  const list = missions.map((m) => missionView(m, byMission.get(m.id)));
  const done = list.filter((m) => m.done).length;
  return { missions: list, done, total: TOTAL, bonus: bonusCompleta, completa: done === TOTAL };
}

/** La tarjeta de una persona: las cuatro misiones y cuales ya tiene validadas. */
async function cardOf(eventId, playerId) {
  const claims = eventId
    ? await prisma.missionClaim.findMany({ where: { eventId, playerId } })
    : [];
  return buildCard(claims);
}

/**
 * Valida una mision escaneando a alguien. Devuelve la tarjeta actualizada para
 * que el admin vea en el acto como va esa persona.
 */
async function validate({ eventId, code, missionId, adminId }) {
  const mission = BY_ID.get(String(missionId ?? ""));
  if (!mission) throw notFound("Esa mision no existe");

  const player = await findByCode(String(code ?? "").toUpperCase().trim());
  if (!player) throw notFound("Ese codigo no es de nadie");
  if (player.role !== "PLAYER") throw conflict("Esa cuenta es de administracion, no juega");

  const card = await withTx(async (tx, onCommit) => {
    try {
      await tx.missionClaim.create({
        data: { eventId, playerId: player.id, missionId: mission.id, validatedById: adminId },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw conflict(`${player.name} ya tenia validada "${mission.title}"`);
      }
      throw error;
    }

    const claims = await tx.missionClaim.findMany({ where: { eventId, playerId: player.id } });
    const nueva = buildCard(claims);

    const entries = [
      {
        playerId: player.id,
        amount: mission.points,
        refKey: `mision:${mission.id}`,
        label: mission.title,
      },
    ];
    // El bono por completar las cuatro se entrega solo, sin que nadie lo pida.
    if (nueva.completa) {
      entries.push({
        playerId: player.id,
        amount: bonusCompleta,
        refKey: "mision:completa",
        label: "Tarjeta completa",
      });
    }
    const results = await grant(tx, eventId, entries);

    onCommit(() => {
      announceGrants(eventId, results);
      hub.toPlayer(player.id, "mission:done", {
        missionId: mission.id,
        title: mission.title,
        done: nueva.done,
        total: nueva.total,
        completa: nueva.completa,
      });
    });

    return nueva;
  });

  return { player: publicPlayer(player), mission: mission.id, card };
}

/** Para la premiacion: quien completo la tarjeta y quien va mas cerca. */
async function report(eventId) {
  const claims = await prisma.missionClaim.findMany({
    where: { eventId },
    include: { player: { select: PUBLIC_SELECT } },
    orderBy: { createdAt: "asc" },
  });

  const porPersona = new Map();
  for (const claim of claims) {
    const entry = porPersona.get(claim.playerId) ?? {
      player: publicPlayer(claim.player),
      done: [],
      lastAt: null,
    };
    entry.done.push(claim.missionId);
    entry.lastAt = claim.createdAt;
    porPersona.set(claim.playerId, entry);
  }

  // Primero quien tiene mas misiones; a igualdad, quien las termino antes.
  const people = [...porPersona.values()].sort(
    (a, b) => b.done.length - a.done.length || new Date(a.lastAt) - new Date(b.lastAt),
  );

  const porMision = missions.map((m) => ({
    id: m.id,
    title: m.title,
    count: claims.filter((c) => c.missionId === m.id).length,
  }));

  return {
    completas: people.filter((p) => p.done.length === TOTAL),
    people,
    porMision,
    total: TOTAL,
  };
}

module.exports = { cardOf, validate, report, missions };
