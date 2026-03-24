const express = require("express");
const cors = require("cors");
const session = require("express-session");
require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json());
app.use(
  session({
    name: "bingo.sid",
    secret: process.env.SESSION_SECRET || "dev-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 8,
    },
  }),
);

const firmaRoutes = require("./routes/firmaRoutes");
const cartillaRoutes = require("./routes/cartillaRoutes");
const rankingRoutes = require("./routes/rankingRoutes");
const rondaRoutes = require("./routes/rondaRoutes");
const usuarioRoutes = require("./routes/usuarioRoutes");

app.use("/api/rondas", rondaRoutes);
app.use("/api/firmas", firmaRoutes);
app.use("/api/cartillas", cartillaRoutes);
app.use("/api/ranking", rankingRoutes);
app.use("/api/usuarios", usuarioRoutes);

app.use((err, req, res, next) => {
  console.error("ERROR GLOBAL:", err);
  res.status(500).json({ error: "Error interno del servidor" });
});

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
