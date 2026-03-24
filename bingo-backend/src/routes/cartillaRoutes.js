const express = require('express');
const router = express.Router();
const { obtenerCartilla, casiGanador } = require('../controllers/cartillaController');

router.get('/casi-ganador', casiGanador);
router.get('/:id', obtenerCartilla);

module.exports = router;