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

module.exports = {
  obtenerCartilla,
  casiGanador
};