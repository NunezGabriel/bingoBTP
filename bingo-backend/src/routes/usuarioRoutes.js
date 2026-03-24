const express = require("express");
const {
  registrarUsuario,
  loginUsuario,
  obtenerSesion,
  cerrarSesion,
  listarUsuarios,
} = require("../controllers/usuarioController");

const router = express.Router();

router.post("/register", registrarUsuario);
router.post("/login", loginUsuario);
router.get("/me", obtenerSesion);
router.post("/logout", cerrarSesion);
router.get("/", listarUsuarios);

module.exports = router;

