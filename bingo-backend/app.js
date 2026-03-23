const express = require('express');
const app = express();
const cors = require('cors');

app.use(cors());
app.use(express.json());

const firmaRoutes = require('./routes/firmaRoutes');
const cartillaRoutes = require('./routes/cartillaRoutes');
const rankingRoutes = require('./routes/rankingRoutes');

app.use('/api/firmas', firmaRoutes);
app.use('/api/cartillas', cartillaRoutes);
app.use('/api/ranking', rankingRoutes);

app.listen(3000, () => {
  console.log('Servidor corriendo 🚀');
});