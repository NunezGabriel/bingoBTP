const express = require('express');
const router = express.Router();
const {
  obtenerCartilla,
  casiGanador,
  obtenerMiCartilla,
} = require('../controllers/cartillaController');

router.get('/casi-ganador', casiGanador);
router.get('/mi', obtenerMiCartilla);
router.get('/:id', obtenerCartilla);

module.exports = router;