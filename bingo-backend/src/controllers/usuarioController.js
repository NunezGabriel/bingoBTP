const prisma = require("../prismaClient");
const realtime = require("../realtime");

const USER_TYPES = { ADMIN: "ADMIN", PARTICIPANT: "PARTICIPANT" };
const CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function sanitizeUser(user) {
  return {
    id: user.id,
    nombre: user.nombre,
    codigo: user.codigo,
    tipo: user.tipo,
  };
}

async function registrarUsuario(req, res) {
  try {
    const { nombre, tipo } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: "nombre es obligatorio" });
    }

    const userType =
      tipo === USER_TYPES.ADMIN ? USER_TYPES.ADMIN : USER_TYPES.PARTICIPANT;

    const cleanName = String(nombre).trim();
    if (!cleanName) {
      return res.status(400).json({ error: "nombre es obligatorio" });
    }

    const userCode = await generarCodigoUnico();
    const rondaActiva = await getOrCreateActiveRonda();
    const casillasCartilla = await obtenerCasillasAleatorias(9);

    const payload = await prisma.$transaction(async (tx) => {
      const user = await tx.usuario.create({
        data: {
          nombre: cleanName,
          codigo: userCode,
          tipo: userType,
        },
      });

      const cartilla = await tx.cartilla.create({
        data: {
          participantId: user.id,
          rondaId: rondaActiva.id,
          completo: false,
        },
      });

      await tx.relacionCasilla.createMany({
        data: casillasCartilla.map((casilla) => ({
          cartillaId: cartilla.id,
          casillaId: casilla.id,
        })),
      });

      const cartillaConRelaciones = await tx.cartilla.findUnique({
        where: { id: cartilla.id },
        include: {
          casillas: {
            include: { casilla: true },
          },
          firmas: true,
        },
      });

      return { user, cartilla: cartillaConRelaciones };
    });

    req.session.user = sanitizeUser(payload.user);
    realtime.notificarCambio();
    return res.status(201).json({
      user: req.session.user,
      cartilla: payload.cartilla,
    });
  } catch (error) {
    console.error("ERROR registrarUsuario:", error);
    return res.status(500).json({ error: "error al registrar usuario" });
  }
}

async function loginUsuario(req, res) {
  try {
    const { codigo } = req.body;
    if (!codigo)
      return res.status(400).json({ error: "codigo es obligatorio" });

    const user = await prisma.usuario.findUnique({
      where: { codigo: String(codigo).trim().toUpperCase() },
    });

    if (!user) return res.status(404).json({ error: "usuario no encontrado" });

    req.session.user = sanitizeUser(user);
    return res.json(req.session.user);
  } catch (error) {
    console.error("ERROR loginUsuario:", error);
    return res.status(500).json({ error: "error al iniciar sesion" });
  }
}

function obtenerSesion(req, res) {
  if (!req.session.user)
    return res.status(401).json({ error: "no autenticado" });
  return res.json(req.session.user);
}

function cerrarSesion(req, res) {
  req.session.destroy(() => {
    res.clearCookie("bingo.sid");
    res.json({ ok: true });
  });
}

async function listarUsuarios(req, res) {
  try {
    const users = await prisma.usuario.findMany({ orderBy: { id: "asc" } });
    return res.json(users.map(sanitizeUser));
  } catch (error) {
    console.error("ERROR listarUsuarios:", error);
    return res.status(500).json({ error: "error al listar usuarios" });
  }
}

/**
 * Elimina un participante y todo su rastro de juego.
 *
 * Ojo: tambien borra las firmas que esa persona dio en cartillas ajenas
 * (su codigo deja de ser valido), asi que el progreso de otros puede bajar.
 * Los ADMIN no se pueden eliminar por esta via.
 */
async function eliminarUsuario(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "id invalido" });
    }

    const usuario = await prisma.usuario.findUnique({ where: { id } });
    if (!usuario) {
      return res.status(404).json({ error: "usuario no encontrado" });
    }
    if (usuario.tipo === USER_TYPES.ADMIN) {
      return res
        .status(403)
        .json({ error: "no se puede eliminar una cuenta ADMIN" });
    }

    const resumen = await prisma.$transaction(async (tx) => {
      const cartillas = await tx.cartilla.findMany({
        where: { participantId: id },
        select: { id: true },
      });
      const cartillaIds = cartillas.map((c) => c.id);

      // Firmas propias (en sus cartillas) y las que dio o recibio en otras.
      const firmas = await tx.firma.deleteMany({
        where: {
          OR: [
            { cartillaId: { in: cartillaIds } },
            { firmadoPorId: id },
            { firmadoAId: id },
          ],
        },
      });
      await tx.relacionCasilla.deleteMany({
        where: { cartillaId: { in: cartillaIds } },
      });
      await tx.cartilla.deleteMany({ where: { participantId: id } });
      await tx.usuario.delete({ where: { id } });

      return { cartillasEliminadas: cartillaIds.length, firmasEliminadas: firmas.count };
    });

    realtime.notificarCambio();
    return res.json({
      ok: true,
      usuario: { id: usuario.id, nombre: usuario.nombre, codigo: usuario.codigo },
      ...resumen,
    });
  } catch (error) {
    console.error("ERROR eliminarUsuario:", error);
    return res.status(500).json({ error: "error al eliminar usuario" });
  }
}

/**
 * Borra a TODOS los participantes y sus datos de juego.
 * Las cuentas ADMIN, las casillas y las rondas se conservan.
 */
async function eliminarTodosLosParticipantes(req, res) {
  try {
    const resumen = await prisma.$transaction(
      async (tx) => {
        const participantes = await tx.usuario.findMany({
          where: { tipo: USER_TYPES.PARTICIPANT },
          select: { id: true },
        });
        const ids = participantes.map((p) => p.id);

        if (ids.length === 0) {
          return { usuariosEliminados: 0, cartillasEliminadas: 0 };
        }

        const cartillas = await tx.cartilla.findMany({
          where: { participantId: { in: ids } },
          select: { id: true },
        });
        const cartillaIds = cartillas.map((c) => c.id);

        await tx.firma.deleteMany({
          where: {
            OR: [
              { cartillaId: { in: cartillaIds } },
              { firmadoPorId: { in: ids } },
              { firmadoAId: { in: ids } },
            ],
          },
        });
        await tx.relacionCasilla.deleteMany({
          where: { cartillaId: { in: cartillaIds } },
        });
        await tx.cartilla.deleteMany({ where: { id: { in: cartillaIds } } });
        const borrados = await tx.usuario.deleteMany({
          where: { id: { in: ids } },
        });

        return {
          usuariosEliminados: borrados.count,
          cartillasEliminadas: cartillaIds.length,
        };
      },
      { maxWait: 10000, timeout: 30000 },
    );

    realtime.notificarCambio();
    return res.json({ ok: true, ...resumen });
  } catch (error) {
    console.error("ERROR eliminarTodosLosParticipantes:", error);
    return res.status(500).json({ error: "error al eliminar participantes" });
  }
}

module.exports = {
  registrarUsuario,
  loginUsuario,
  obtenerSesion,
  cerrarSesion,
  listarUsuarios,
  eliminarUsuario,
  eliminarTodosLosParticipantes,
};

async function getOrCreateActiveRonda() {
  const activa = await prisma.ronda.findFirst({
    where: { activa: true },
    orderBy: { createdAt: "desc" },
  });

  if (activa) {
    return activa;
  }

  return prisma.ronda.create({
    data: {
      nombre: `Ronda ${new Date().toISOString()}`,
      activa: true,
    },
  });
}

async function obtenerCasillasAleatorias(limit) {
  let casillas = await prisma.casilla.findMany();
  if (casillas.length < limit) {
    const faltantes = limit - casillas.length;
    const maxNumero = casillas.reduce((max, c) => Math.max(max, c.numero), 0);

    for (let i = 1; i <= faltantes; i += 1) {
      const numero = maxNumero + i;
      await prisma.casilla.create({
        data: {
          numero,
          pregunta: `Pregunta ${numero}`,
        },
      });
    }
    casillas = await prisma.casilla.findMany();
  }

  const shuffled = [...casillas];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, limit);
}

async function generarCodigoUnico() {
  for (let i = 0; i < 20; i += 1) {
    const code = construirCodigo();
    const existing = await prisma.usuario.findUnique({
      where: { codigo: code },
    });
    if (!existing) {
      return code;
    }
  }
  throw new Error("No se pudo generar un codigo unico");
}

function construirCodigo() {
  let out = "";
  for (let i = 0; i < 4; i += 1) {
    out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return out;
}
