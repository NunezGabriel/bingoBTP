const express = require("express");
const requireAdmin = require("../middleware/requireAdmin");
const {
  registrarUsuario,
  loginUsuario,
  obtenerSesion,
  cerrarSesion,
  listarUsuarios,
  eliminarUsuario,
  eliminarTodosLosParticipantes,
} = require("../controllers/usuarioController");

const router = express.Router();

router.post("/register", registrarUsuario);
router.post("/login", loginUsuario);
router.get("/me", obtenerSesion);
router.post("/logout", cerrarSesion);
router.get("/", listarUsuarios);

// La ruta literal va antes que /:id, si no Express toma "participantes"
// como si fuera un id.
router.delete("/participantes", requireAdmin, eliminarTodosLosParticipantes);
router.delete("/:id", requireAdmin, eliminarUsuario);

module.exports = router;
