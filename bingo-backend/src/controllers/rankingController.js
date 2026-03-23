const prisma = require('../prismaClient');

async function obtenerRanking(req, res) {
  try {
    const ranking = await prisma.firma.groupBy({
      by: ['firmadoPorId'],
      _count: {
        firmadoPorId: true
      },
      orderBy: {
        _count: {
          firmadoPorId: 'desc'
        }
      }
    });

    // traer nombres
    const resultado = await Promise.all(
      ranking.map(async (r) => {
        const user = await prisma.usuario.findUnique({
          where: { id: r.firmadoPorId }
        });

        return {
          nombre: user.nombre,
          puntos: r._count.firmadoPorId
        };
      })
    );

    res.json(resultado);

  } catch (error) {
    res.status(500).json({ error: 'Error ranking' });
  }
}

module.exports = {
  obtenerRanking
};