const express = require('express');
const router = express.Router();
const { obtenerRanking } = require('../controllers/rankingController');

router.get('/', obtenerRanking);

module.exports = router;