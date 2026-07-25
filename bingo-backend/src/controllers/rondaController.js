const prisma = require("../prismaClient");
const realtime = require("../realtime");
const { obtenerProgresoActual } = require("../services/progresoService");

const CASILLAS_POR_CARTILLA = 9;

async function crearRonda(req, res) {
  try {
    // desactivar rondas anteriores
    await prisma.ronda.updateMany({
      where: { activa: true },
      data: { activa: false },
    });

    const ronda = await prisma.ronda.create({
      data: {
        nombre: `Ronda ${Date.now()}`,
      },
    });

    realtime.notificarCambio();
    res.json(ronda);
  } catch (error) {
    res.status(500).json({ error: "Error creando ronda" });
  }
}

async function obtenerRondaActiva(req, res) {
  const ronda = await prisma.ronda.findFirst({
    where: { activa: true },
  });

  res.json(ronda);
}

/**
 * Crea una ronda nueva y reparte una cartilla a cada participante.
 *
 * Todo se hace en operaciones masivas (4 queries en total). La version
 * anterior recorria participante por participante dentro de la transaccion
 * (~5 queries cada uno), lo que con 137 personas daba ~685 viajes a Neon
 * y superaba el timeout de 60s de la transaccion -> error 500.
 */
async function crearNuevaRondaAdmin(req, res) {
  try {
    const [participants, casillas] = await Promise.all([
      prisma.usuario.findMany({
        where: { tipo: "PARTICIPANT" },
        orderBy: { id: "asc" },
        select: { id: true },
      }),
      prisma.casilla.findMany({ select: { id: true } }),
    ]);

    if (participants.length === 0) {
      return res
        .status(400)
        .json({ error: "No hay participantes registrados" });
    }
    if (casillas.length < CASILLAS_POR_CARTILLA) {
      return res.status(400).json({
        error: "No hay suficientes casillas para crear cartillas",
      });
    }

    const payload = await prisma.$transaction(
      async (tx) => {
        await tx.ronda.updateMany({
          where: { activa: true },
          data: { activa: false },
        });

        const ronda = await tx.ronda.create({
          data: {
            nombre: `Ronda ${new Date().toLocaleString("es-PE")}`,
            activa: true,
          },
        });

        // Cartillas nuevas por ronda: las anteriores quedan intactas, asi
        // el historial de rondas pasadas se conserva.
        const cartillas = await tx.cartilla.createManyAndReturn({
          data: participants.map((p) => ({
            participantId: p.id,
            rondaId: ronda.id,
            completo: false,
          })),
          select: { id: true },
        });

        const relaciones = [];
        for (const cartilla of cartillas) {
          for (const casilla of pickRandom(casillas, CASILLAS_POR_CARTILLA)) {
            relaciones.push({ cartillaId: cartilla.id, casillaId: casilla.id });
          }
        }
        await tx.relacionCasilla.createMany({ data: relaciones });

        return { ronda, totalParticipantes: participants.length };
      },
      { maxWait: 10000, timeout: 30000 },
    );

    realtime.notificarCambio();
    return res.json(payload);
  } catch (error) {
    console.error("Error creando nueva ronda admin:", {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
    });
    return res.status(500).json({ error: "Error creando ronda" });
  }
}

async function obtenerProgresoRondaAdmin(req, res) {
  try {
    const progreso = await obtenerProgresoActual();
    if (!progreso) {
      return res.status(404).json({ error: "No hay ronda activa" });
    }
    return res.json(progreso);
  } catch (error) {
    console.error("Error obteniendo progreso admin:", error);
    return res.status(500).json({ error: "Error obteniendo progreso de ronda" });
  }
}

async function finalizarRondaAdmin(req, res) {
  try {
    const rondaActiva = await prisma.ronda.findFirst({
      where: { activa: true },
      orderBy: { createdAt: "desc" },
    });

    if (!rondaActiva) {
      return res.status(404).json({ error: "No hay ronda activa" });
    }

    const ronda = await prisma.ronda.update({
      where: { id: rondaActiva.id },
      data: { activa: false },
    });

    realtime.notificarCambio();
    return res.json({
      ok: true,
      ronda: { id: ronda.id, nombre: ronda.nombre, activa: ronda.activa },
    });
  } catch (error) {
    console.error("Error finalizando ronda admin:", error);
    return res.status(500).json({ error: "Error finalizando ronda" });
  }
}

function streamProgresoAdmin(req, res) {
  realtime.suscribir(req, res);
}

module.exports = {
  crearRonda,
  obtenerRondaActiva,
  crearNuevaRondaAdmin,
  obtenerProgresoRondaAdmin,
  finalizarRondaAdmin,
  streamProgresoAdmin,
};

function pickRandom(items, count) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}
