const prisma = require("../prismaClient");

async function firmarCasilla(req, res) {
  const { cartilla_id, casilla_id, codigo_firmador, codigo_destino } = req.body;

  try {
    const sessionUser = req.session?.user;
    if (!sessionUser) {
      return res.status(401).json({ error: "no autenticado" });
    }

    // 1. validar usuarios por código
    const [firmador, cartilla] = await Promise.all([
      prisma.usuario.findUnique({
        where: { codigo: String(codigo_firmador || "").trim().toUpperCase() },
      }),
      prisma.cartilla.findUnique({
        where: { id: Number(cartilla_id) },
      }),
    ]);

    if (!cartilla) {
      return res.status(404).json({ error: "Cartilla no encontrada" });
    }

    if (cartilla.participantId !== sessionUser.id) {
      return res.status(403).json({ error: "Cartilla no autorizada" });
    }

    const destinoCodigo = String(
      codigo_destino || sessionUser.codigo || "",
    ).trim().toUpperCase();

    const destino = await prisma.usuario.findUnique({
      where: { codigo: destinoCodigo }
    });

    if (!firmador || !destino) {
      return res.status(404).json({ error: "Usuario no valido" });
    }

    // 2. no auto-firma
    if (firmador.id === destino.id) {
      return res.status(400).json({ error: "No puedes firmarte a ti mismo" });
    }

    // 3. validar que la casilla pertenece a la cartilla
    const existeRelacion = await prisma.relacionCasilla.findUnique({
      where: {
        cartillaId_casillaId: {
          cartillaId: Number(cartilla_id),
          casillaId: Number(casilla_id),
        }
      }
    });

    if (!existeRelacion) {
      return res.status(400).json({ error: 'Casilla no pertenece a la cartilla' });
    }

    // 4. verificar si ya está firmada
    const yaFirmada = await prisma.firma.findFirst({
      where: {
        cartillaId: Number(cartilla_id),
        casillaId: Number(casilla_id),
      }
    });

    if (yaFirmada) {
      return res.status(400).json({ error: "Casilla ya firmada" });
    }

    const yaUsoCodigoEnEstaCartilla = await prisma.firma.findFirst({
      where: {
        cartillaId: Number(cartilla_id),
        firmadoPorId: firmador.id,
      },
    });

    if (yaUsoCodigoEnEstaCartilla) {
      return res
        .status(400)
        .json({ error: "Ese codigo ya fue usado en otra casilla" });
    }

    // 5. validar ronda activa de la cartilla
    const rondaActiva = await prisma.ronda.findFirst({
      where: { activa: true },
    });
    if (!rondaActiva || cartilla.rondaId !== rondaActiva.id) {
      return res.status(400).json({ error: "Cartilla fuera de ronda activa" });
    }

    // 6. crear firma
    await prisma.firma.create({
      data: {
        cartillaId: Number(cartilla_id),
        casillaId: Number(casilla_id),
        firmadoPorId: firmador.id,
        firmadoAId: destino.id
      }
    });

    // 7. contar progreso
    const totalFirmas = await prisma.firma.count({
      where: { cartillaId: Number(cartilla_id) }
    });

    // 8. marcar cartilla completa al llenar todas las casillas
    const totalCasillas = await prisma.relacionCasilla.count({
      where: { cartillaId: Number(cartilla_id) },
    });

    if (totalFirmas >= totalCasillas) {
      await prisma.cartilla.update({
        where: { id: Number(cartilla_id) },
        data: { completo: true },
      });
      return res.json({ ganador: true, progreso: totalFirmas });
    }

    return res.json({ ok: true, progreso: totalFirmas });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno" });
  }
}

module.exports = {
  firmarCasilla,
};