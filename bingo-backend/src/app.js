const express = require("express");
const cors = require("cors");
const session = require("express-session");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
app.set("trust proxy", 1);

app.use(
  cors({
    origin: (origin, callback) => {
      // Permite requests server-to-server (sin Origin) y herramientas locales.
      if (!origin) return callback(null, true);

      const allowlist = [
        process.env.FRONTEND_URL,
        ...(process.env.FRONTEND_URLS ? process.env.FRONTEND_URLS.split(",") : []),
      ]
        .map((s) => (s ? s.trim() : ""))
        .filter(Boolean);

      // Permite subdominios de Vercel (previews) si usas *.vercel.app
      const isVercelPreview = /\.vercel\.app$/.test(new URL(origin).hostname);

      if (allowlist.includes(origin) || isVercelPreview) {
        return callback(null, true);
      }
      return callback(new Error("CORS: origin no permitido"));
    },
    credentials: true,
  }),
);
app.use(express.json());

const pgSession = require("connect-pg-simple")(session);
const sessionPool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(
  session({
    name: "bingo.sid",
    secret: process.env.SESSION_SECRET || "dev-session-secret",
    resave: false,
    saveUninitialized: false,
    store: new pgSession({
      pool: sessionPool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      // Para requests fetch cross-site (Vercel -> backend en otro dominio) en producción:
      // sameSite=None requiere secure=true en navegadores.
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
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
