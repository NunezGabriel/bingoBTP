const prisma = require("../prismaClient");

const USER_TYPES = { ADMIN: "ADMIN", PARTICIPANT: "PARTICIPANT" };

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
    const { nombre, codigo, tipo } = req.body;

    if (!nombre || !codigo) {
      return res
        .status(400)
        .json({ error: "nombre y codigo son obligatorios" });
    }

    const userType =
      tipo === USER_TYPES.ADMIN ? USER_TYPES.ADMIN : USER_TYPES.PARTICIPANT;

    const user = await prisma.usuario.create({
      data: {
        nombre: String(nombre).trim(),
        codigo: String(codigo).trim().toUpperCase(),
        tipo: userType,
      },
    });

    req.session.user = sanitizeUser(user);
    return res.status(201).json(req.session.user);
  } catch (error) {
    console.error("ERROR registrarUsuario:", error);
    if (error?.code === "P2002") {
      return res.status(409).json({ error: "codigo ya registrado" });
    }
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

module.exports = {
  registrarUsuario,
  loginUsuario,
  obtenerSesion,
  cerrarSesion,
  listarUsuarios,
};
