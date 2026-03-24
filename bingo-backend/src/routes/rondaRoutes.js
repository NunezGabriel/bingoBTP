const express = require('express');
const router = express.Router();
const {
  crearRonda,
  obtenerRondaActiva,
  crearNuevaRondaAdmin,
  obtenerProgresoRondaAdmin,
  finalizarRondaAdmin,
} = require('../controllers/rondaController');

router.post('/crear', crearRonda);
router.get('/activa', obtenerRondaActiva);
router.get('/admin/progreso', obtenerProgresoRondaAdmin);
router.post('/admin/crear', crearNuevaRondaAdmin);
router.post('/admin/finalizar', finalizarRondaAdmin);

module.exports = router;