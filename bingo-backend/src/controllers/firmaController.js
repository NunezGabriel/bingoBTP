const prisma = require('../prismaClient');

async function firmarCasilla(req, res) {
  const { cartilla_id, casilla_id, codigo_firmador, codigo_destino } = req.body;

  try {
    // 1. validar usuarios por código
    const firmador = await prisma.usuario.findUnique({
      where: { codigo: codigo_firmador }
    });

    const destino = await prisma.usuario.findUnique({
      where: { codigo: codigo_destino }
    });

    if (!firmador || !destino) {
      return res.status(404).json({ error: 'Usuario no válido' });
    }

    // 2. no auto-firma
    if (firmador.id === destino.id) {
      return res.status(400).json({ error: 'No puedes firmarte a ti mismo' });
    }

    // 3. validar que la casilla pertenece a la cartilla
    const existeRelacion = await prisma.relacionCasilla.findUnique({
      where: {
        cartillaId_casillaId: {
          cartillaId: cartilla_id,
          casillaId: casilla_id
        }
      }
    });

    if (!existeRelacion) {
      return res.status(400).json({ error: 'Casilla no pertenece a la cartilla' });
    }

    // 4. verificar si ya está firmada
    const yaFirmada = await prisma.firma.findUnique({
      where: {
        cartillaId_casillaId: {
          cartillaId: cartilla_id,
          casillaId: casilla_id
        }
      }
    });

    if (yaFirmada) {
      return res.status(400).json({ error: 'Casilla ya firmada' });
    }

    // 5. crear firma
    await prisma.firma.create({
      data: {
        cartillaId: cartilla_id,
        casillaId: casilla_id,
        firmadoPorId: firmador.id,
        firmadoAId: destino.id
      }
    });

    // 6. contar progreso
    const totalFirmas = await prisma.firma.count({
      where: { cartillaId: cartilla_id }
    });

    // 🔥 ALERTA: casi ganador
    if (totalFirmas === 8) {
      console.log('🔥 ESTA CARTILLA ESTÁ A 1 DE GANAR');
    }

    // 🏆 ganador
    if (totalFirmas === 9) {
      await prisma.cartilla.update({
        where: { id: cartilla_id },
        data: { completo: true }
      });

      return res.json({ ganador: true });
    }

    res.json({ ok: true, progreso: totalFirmas });

    //7. Ranking por firmas hechas

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

    //8. Casi ganadores (7 firmas)

    const casiGanadores = await prisma.cartilla.findMany({
        where: {
            completo: false,
            firmas: {
            some: {}
            }
        },
        include: {
            firmas: true
        }
    });

    const resultado = casiGanadores.filter(c => c.firmas.length === 7);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
}