const express = require('express');
const router = express.Router();
const requireAdmin = require('../middleware/requireAdmin');
const {
  crearRonda,
  obtenerRondaActiva,
  crearNuevaRondaAdmin,
  obtenerProgresoRondaAdmin,
  finalizarRondaAdmin,
  streamProgresoAdmin,
} = require('../controllers/rondaController');

router.post('/crear', crearRonda);
router.get('/activa', obtenerRondaActiva);

router.get('/admin/progreso', requireAdmin, obtenerProgresoRondaAdmin);
router.get('/admin/stream', requireAdmin, streamProgresoAdmin);
router.post('/admin/crear', requireAdmin, crearNuevaRondaAdmin);
router.post('/admin/finalizar', requireAdmin, finalizarRondaAdmin);

module.exports = router;
