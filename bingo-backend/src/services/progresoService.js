const prisma = require("../prismaClient");

/**
 * Snapshot de la ronda activa: participantes + KPIs.
 * Lo usan tanto el endpoint REST como el stream SSE, para que ambos
 * devuelvan exactamente la misma forma de datos.
 *
 * @returns {Promise<object|null>} null si no hay ronda activa.
 */
async function obtenerProgresoActual() {
  const ronda = await prisma.ronda.findFirst({
    where: { activa: true },
    orderBy: { createdAt: "desc" },
  });

  if (!ronda) return null;

  const cartillas = await prisma.cartilla.findMany({
    where: { rondaId: ronda.id },
    include: {
      participant: { select: { id: true, nombre: true, codigo: true } },
      _count: { select: { firmas: true, casillas: true } },
    },
    orderBy: { id: "asc" },
  });

  const participantes = cartillas.map((c) => ({
    usuarioId: c.participant.id,
    nombre: c.participant.nombre,
    codigo: c.participant.codigo,
    cartillaId: c.id,
    firmas: c._count.firmas,
    totalCasillas: c._count.casillas,
    progreso: `${c._count.firmas}/${c._count.casillas}`,
    completas: c.completo,
  }));

  // Ranking: primero los que ya hicieron bingo, luego por avance desc.
  const ordenados = [...participantes].sort((a, b) => {
    if (a.completas !== b.completas) return a.completas ? -1 : 1;
    if (b.firmas !== a.firmas) return b.firmas - a.firmas;
    return a.nombre.localeCompare(b.nombre);
  });

  const total = participantes.length;
  const bingos = participantes.filter((p) => p.completas).length;
  const sinEmpezar = participantes.filter((p) => p.firmas === 0).length;
  const firmasTotales = participantes.reduce((acc, p) => acc + p.firmas, 0);
  const casillasTotales = participantes.reduce(
    (acc, p) => acc + p.totalCasillas,
    0,
  );

  return {
    ronda: { id: ronda.id, nombre: ronda.nombre, activa: ronda.activa },
    kpis: {
      totalParticipantes: total,
      bingos,
      enJuego: total - bingos - sinEmpezar,
      sinEmpezar,
      firmasTotales,
      avancePromedio: casillasTotales
        ? Math.round((firmasTotales / casillasTotales) * 100)
        : 0,
    },
    participantes: ordenados,
    actualizadoEn: new Date().toISOString(),
  };
}

module.exports = { obtenerProgresoActual };
