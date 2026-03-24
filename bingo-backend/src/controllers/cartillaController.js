const prisma = require('../prismaClient');

async function obtenerCartilla(req, res) {
  const { id } = req.params;

  try {
    const cartilla = await prisma.cartilla.findUnique({
      where: { id: parseInt(id) },
      include: {
        casillas: {
          include: {
            casilla: true
          }
        },
        firmas: true
      }
    });

    if (!cartilla) {
      return res.status(404).json({ error: 'Cartilla no encontrada' });
    }

    res.json(cartilla);

  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cartilla' });
  }
}

async function casiGanador(req, res) {
  try {
    const cartillas = await prisma.cartilla.findMany({
      where: { completo: false },
      include: { firmas: true }
    });

    const resultado = cartillas.filter(c => c.firmas.length === 7);

    res.json(resultado);

  } catch (error) {
    res.status(500).json({ error: 'Error' });
  }
}

async function obtenerMiCartilla(req, res) {
  try {
    const sessionUser = req.session?.user;
    if (!sessionUser) {
      return res.status(401).json({ error: "no autenticado" });
    }

    const rondaActiva = await prisma.ronda.findFirst({
      where: { activa: true },
      orderBy: { createdAt: "desc" },
    });

    if (!rondaActiva) {
      return res.status(404).json({ error: "No hay ronda activa" });
    }

    const cartilla = await prisma.cartilla.findFirst({
      where: {
        participantId: sessionUser.id,
        rondaId: rondaActiva.id,
      },
      include: {
        casillas: {
          include: { casilla: true },
        },
        firmas: true,
      },
    });

    if (!cartilla) {
      return res.status(404).json({ error: "Cartilla no encontrada" });
    }

    return res.json(cartilla);
  } catch (error) {
    return res.status(500).json({ error: "Error al obtener cartilla" });
  }
}

module.exports = {
  obtenerCartilla,
  casiGanador,
  obtenerMiCartilla,
};