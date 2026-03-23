const express = require('express');
const router = express.Router();
const { crearRonda, obtenerRondaActiva } = require('../controllers/rondaController');

router.post('/crear', crearRonda);
router.get('/activa', obtenerRondaActiva);

module.exports = router;