require("dotenv").config({ quiet: true });

const isProduction = process.env.NODE_ENV === "production";

function int(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

const sessionSecret = process.env.SESSION_SECRET || "";
if (isProduction && sessionSecret.length < 16) {
  // Con un secreto debil cualquiera puede fabricar la cookie de un admin.
  throw new Error("SESSION_SECRET debe tener al menos 16 caracteres en produccion.");
}

// Por defecto se mantiene el comportamiento de siempre: produccion detras de
// dominios distintos (Vercel -> Render) necesita secure=true + sameSite=none.
// COOKIE_SECURE=false permite servir por HTTP en una red local.
const cookieSecure =
  process.env.COOKIE_SECURE !== undefined ? process.env.COOKIE_SECURE === "true" : isProduction;

// La cuenta de admin no se registra desde la app: la crea el seeder con estos
// valores. ADMIN_CODE se sigue aceptando para no romper despliegues viejos.
const adminUser = (process.env.ADMIN_USER || "admin").trim();
const adminClave = (process.env.ADMIN_CLAVE || process.env.ADMIN_CODE || "").trim();
if (isProduction && adminClave.length < 8) {
  throw new Error("ADMIN_CLAVE es obligatoria (8 caracteres o mas) en produccion.");
}

module.exports = {
  isProduction,
  port: int("PORT", 3001),
  databaseUrl: process.env.DATABASE_URL,
  dbPoolMax: int("DB_POOL_MAX", 10),

  /** Cuenta de admin que crea el seeder. No se puede registrar desde la app. */
  adminUser,
  adminClave,

  sessionSecret: sessionSecret || "dev-only-secret-no-usar-en-produccion",
  cookie: {
    name: "bg.sid",
    secure: cookieSecure,
    sameSite: process.env.COOKIE_SAMESITE || (cookieSecure ? "none" : "lax"),
    // Dia y medio de evento mas margen: la sesion sobrevive a recargas y a
    // cerrar el navegador, pero no se queda viva para siempre.
    maxAgeMs: 1000 * 60 * 60 * 24 * 10,
  },

  lobby: {
    /** El ticket del WebSocket se pide con la cookie y dura lo justo para conectar. */
    ticketMaxAgeMs: 60_000,
    /** Fotos del lobby por segundo que se mandan a cada celular. */
    snapshotHz: int("LOBBY_HZ", 6),
    /** Un saludo cada 30 s por persona. */
    emoteCooldownMs: 30_000,
    /** Tamano del escenario en pixeles del mundo. */
    width: 960,
    height: 540,
  },

  frontendOrigins: [
    process.env.FRONTEND_URL,
    ...(process.env.FRONTEND_URLS ? process.env.FRONTEND_URLS.split(",") : []),
  ]
    .map((s) => (s ? s.trim() : ""))
    .filter(Boolean),
};
