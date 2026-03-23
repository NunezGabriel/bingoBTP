const express = require('express');
const app = express();
const cors = require('cors');

app.use(cors());
app.use(express.json());

const firmaRoutes = require('./src/routes/firmaRoutes');
const cartillaRoutes = require('./src/routes/cartillaRoutes');
const rankingRoutes = require('./src/routes/rankingRoutes');
const rondaRoutes = require('./src/routes/rondaRoutes');

app.use('/api/rondas', rondaRoutes);
app.use('/api/firmas', firmaRoutes);
app.use('/api/cartillas', cartillaRoutes);
app.use('/api/ranking', rankingRoutes);

app.listen(3000, () => {
  console.log('Servidor corriendo 🚀');
});