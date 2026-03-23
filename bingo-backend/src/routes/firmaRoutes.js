const express = require('express');
const router = express.Router();
const { firmarCasilla } = require('../controllers/firmaController');

router.post('/firmar', firmarCasilla);

module.exports = router;