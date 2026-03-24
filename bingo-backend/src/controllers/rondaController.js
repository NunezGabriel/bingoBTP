const prisma = require('../prismaClient');

async function crearRonda(req, res) {
  try {
    // desactivar rondas anteriores
    await prisma.ronda.updateMany({
      where: { activa: true },
      data: { activa: false }
    });

    const ronda = await prisma.ronda.create({
      data: {
        nombre: `Ronda ${Date.now()}`
      }
    });

    res.json(ronda);

  } catch (error) {
    res.status(500).json({ error: 'Error creando ronda' });
  }
}

async function obtenerRondaActiva(req, res) {
  const ronda = await prisma.ronda.findFirst({
    where: { activa: true }
  });

  res.json(ronda);
}

async function crearNuevaRondaAdmin(req, res) {
  try {
    const sessionUser = req.session?.user;
    if (!sessionUser) {
      return res.status(401).json({ error: "no autenticado" });
    }
    if (sessionUser.tipo !== "ADMIN") {
      return res.status(403).json({ error: "solo admin" });
    }

    const participants = await prisma.usuario.findMany({
      where: { tipo: "PARTICIPANT" },
      orderBy: { id: "asc" },
    });

    if (participants.length === 0) {
      return res.status(400).json({ error: "No hay participantes registrados" });
    }

    const casillas = await prisma.casilla.findMany();
    if (casillas.length < 9) {
      return res.status(400).json({ error: "No hay suficientes casillas para crear cartillas" });
    }

    const payload = await prisma.$transaction(
      async (tx) => {
        await tx.ronda.updateMany({
          where: { activa: true },
          data: { activa: false },
        });

        const ronda = await tx.ronda.create({
          data: {
            nombre: `Ronda ${Date.now()}`,
            activa: true,
          },
        });

        for (const participant of participants) {
          const sample = pickRandom(casillas, 9);
          const existingCartilla = await tx.cartilla.findFirst({
            where: { participantId: participant.id },
            orderBy: { id: "desc" },
          });
          let cartilla;

          if (existingCartilla) {
            await tx.firma.deleteMany({
              where: { cartillaId: existingCartilla.id },
            });
            await tx.relacionCasilla.deleteMany({
              where: { cartillaId: existingCartilla.id },
            });

            cartilla = await tx.cartilla.update({
              where: { id: existingCartilla.id },
              data: {
                rondaId: ronda.id,
                completo: false,
              },
            });
          } else {
            cartilla = await tx.cartilla.create({
              data: {
                participantId: participant.id,
                rondaId: ronda.id,
                completo: false,
              },
            });
          }

          await tx.relacionCasilla.createMany({
            data: sample.map((c) => ({
              cartillaId: cartilla.id,
              casillaId: c.id,
            })),
          });
        }

        return {
          ronda,
          totalParticipantes: participants.length,
        };
      },
      {
        maxWait: 10000,
        timeout: 60000,
      },
    );

    return res.json(payload);
  } catch (error) {
    console.error("Error creando nueva ronda admin:", {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
    });
    return res.status(500).json({ error: "Error creando ronda" });
  }
}

async function obtenerProgresoRondaAdmin(req, res) {
  try {
    const sessionUser = req.session?.user;
    if (!sessionUser) {
      return res.status(401).json({ error: "no autenticado" });
    }
    if (sessionUser.tipo !== "ADMIN") {
      return res.status(403).json({ error: "solo admin" });
    }

    const ronda = await prisma.ronda.findFirst({
      where: { activa: true },
      orderBy: { createdAt: "desc" },
    });

    if (!ronda) {
      return res.status(404).json({ error: "No hay ronda activa" });
    }

    const cartillas = await prisma.cartilla.findMany({
      where: { rondaId: ronda.id },
      include: {
        participant: true,
        firmas: true,
        casillas: true,
      },
      orderBy: { id: "asc" },
    });

    const participantes = cartillas.map((c) => ({
      usuarioId: c.participant.id,
      nombre: c.participant.nombre,
      codigo: c.participant.codigo,
      cartillaId: c.id,
      progreso: `${c.firmas.length}/${c.casillas.length}`,
      completas: c.completo,
    }));

    return res.json({
      ronda: {
        id: ronda.id,
        nombre: ronda.nombre,
        activa: ronda.activa,
      },
      participantes,
    });
  } catch (error) {
    console.error("Error obteniendo progreso admin:", error);
    return res.status(500).json({ error: "Error obteniendo progreso de ronda" });
  }
}

async function finalizarRondaAdmin(req, res) {
  try {
    const sessionUser = req.session?.user;
    if (!sessionUser) {
      return res.status(401).json({ error: "no autenticado" });
    }
    if (sessionUser.tipo !== "ADMIN") {
      return res.status(403).json({ error: "solo admin" });
    }

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

    return res.json({
      ok: true,
      ronda: {
        id: ronda.id,
        nombre: ronda.nombre,
        activa: ronda.activa,
      },
    });
  } catch (error) {
    console.error("Error finalizando ronda admin:", error);
    return res.status(500).json({ error: "Error finalizando ronda" });
  }
}

module.exports = {
  crearRonda,
  obtenerRondaActiva,
  crearNuevaRondaAdmin,
  obtenerProgresoRondaAdmin,
  finalizarRondaAdmin,
};

function pickRandom(items, count) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}
