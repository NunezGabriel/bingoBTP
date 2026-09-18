const config = require("./config");
const express = require("express");
const cors = require("cors");
const { prisma } = require("./lib/prisma");
const { HttpError } = require("./lib/http");
const { hashPin, verifyPin, isValidPin } = require("./lib/pin");
const { newPlayerCode } = require("./lib/codes");
const { attachPlayer, requireCsrfHeader } = require("./middleware/auth");
const games = require("./services/games");

const app = express();
// Saltos de proxy confiables para leer la IP real del cliente: 1 con nginx o
// Render directo; 2 si el trafico entra por el rewrite de Vercel y luego Render.
app.set("trust proxy", Number(process.env.TRUST_PROXY ?? 1));
app.disable("x-powered-by");

app.use(
  cors({
    origin(origin, callback) {
      // Sin Origin: peticiones del mismo sitio via proxy, curl, healthchecks.
      if (!origin) return callback(null, true);
      let hostname = "";
      try {
        hostname = new URL(origin).hostname;
      } catch {
        return callback(null, false);
      }
      const allowed =
        config.frontendOrigins.includes(origin) || /\.vercel\.app$/.test(hostname);
      return callback(null, allowed);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api", attachPlayer, requireCsrfHeader);
app.use("/api/auth", require("./routes/auth").router);
app.use("/api/me", require("./routes/me"));
app.use("/api/public", require("./routes/public"));
app.use("/api/stream", require("./routes/stream"));
app.use("/api/game", require("./routes/game"));
app.use("/api/staff", require("./routes/staff"));
app.use("/api/admin", require("./routes/admin"));

app.use("/api", (req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...err.extra });
  }
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "JSON invalido" });
  }
  if (err?.code === "P2025") {
    return res.status(404).json({ error: "No encontrado" });
  }
  console.error("ERROR:", req.method, req.originalUrl, err);
  return res.status(500).json({ error: "Error interno del servidor" });
});

/**
 * Crea (o recupera) la cuenta admin definida en ADMIN_NICKNAME / ADMIN_PIN.
 * Util en Render, donde el plan gratuito no tiene consola para correr scripts.
 * Si el nombre ya existe con OTRO PIN no se toca: nadie puede volverse admin
 * registrando ese nombre antes que tu.
 */
async function bootstrapAdmin() {
  const { nickname, pin } = config.bootstrapAdmin;
  if (!nickname || !pin) return;
  if (!isValidPin(pin)) {
    console.warn("ADMIN_PIN debe tener 4 a 8 digitos; no se creo la cuenta admin.");
    return;
  }
  const key = nickname.normalize("NFC").toLowerCase();
  const existing = await prisma.player.findUnique({ where: { nicknameKey: key } });

  if (!existing) {
    await prisma.player.create({
      data: {
        nickname,
        nicknameKey: key,
        pinHash: await hashPin(pin),
        role: "ADMIN",
        avatarClass: "mago",
        avatarHouse: "azul",
        code: newPlayerCode(),
      },
    });
    console.log(`Cuenta admin "${nickname}" creada.`);
    return;
  }
  if (existing.role !== "ADMIN") {
    if (await verifyPin(pin, existing.pinHash)) {
      await prisma.player.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
      console.log(`Cuenta "${nickname}" promovida a admin.`);
    } else {
      console.warn(
        `"${nickname}" ya existe con otro PIN y no es admin. No se promovio por seguridad.`,
      );
    }
  }
}

/**
 * Espera a que la base acepte conexiones antes de arrancar. Pasa en local si
 * se levanta la API antes que `npm run db`, y en Docker/Render si la base
 * tarda en despertar: mejor esperar unos segundos que caerse.
 */
async function waitForDatabase({ attempts = 30, delayMs = 2000 } = {}) {
  for (let i = 1; i <= attempts; i += 1) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      if (i > 1) console.log("Base de datos lista.");
      return;
    } catch (error) {
      const unreachable = ["ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN"].includes(
        error?.code ?? error?.cause?.code,
      );
      if (!unreachable || i === attempts) throw error;
      if (i === 1) console.log("Esperando a la base de datos (¿corriste npm run db?)...");
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function start() {
  await waitForDatabase();
  await bootstrapAdmin();
  const recovered = await games.recoverGames();
  if (recovered) console.log(`Juegos: ${recovered} cuenta(s) regresiva(s) reprogramada(s).`);

  const server = app.listen(config.port, () => {
    console.log(`Misti Quest API en puerto ${config.port}`);
  });
  // Detras de proxies (Render, nginx) conviene que el keep-alive del servidor
  // dure mas que el del proxy, o aparecen 502 intermitentes.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
  return server;
}

if (require.main === module) {
  start().catch((error) => {
    console.error("No se pudo iniciar el servidor:", error);
    process.exit(1);
  });
}

module.exports = { app, start };
