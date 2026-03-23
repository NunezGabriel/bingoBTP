const express = require('express');
const router = express.Router();
const { obtenerCartilla, casiGanador } = require('../controllers/cartillaController');

router.get('/:id', obtenerCartilla);
router.get('/casi-ganador', casiGanador);

module.exports = router;