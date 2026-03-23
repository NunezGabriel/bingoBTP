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

module.exports = {
  crearRonda,
  obtenerRondaActiva
};