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

const adminCode = (process.env.ADMIN_CODE || "").trim();
if (isProduction && adminCode.length < 4) {
  throw new Error("ADMIN_CODE es obligatorio (4 caracteres o mas) en produccion.");
}

module.exports = {
  isProduction,
  port: int("PORT", 3001),
  databaseUrl: process.env.DATABASE_URL,
  dbPoolMax: int("DB_POOL_MAX", 10),

  /** Codigo con el que se entra al panel admin (/admin). */
  adminCode,

  sessionSecret: sessionSecret || "dev-only-secret-no-usar-en-produccion",
  cookie: {
    name: "bg.sid",
    adminName: "bg.adm",
    secure: cookieSecure,
    sameSite: process.env.COOKIE_SAMESITE || (cookieSecure ? "none" : "lax"),
    maxAgeMs: 1000 * 60 * 60 * 24 * 60, // 60 dias: la cartilla sobrevive a recargas
    adminMaxAgeMs: 1000 * 60 * 60 * 12, // 12 horas: dura el evento
  },

  frontendOrigins: [
    process.env.FRONTEND_URL,
    ...(process.env.FRONTEND_URLS ? process.env.FRONTEND_URLS.split(",") : []),
  ]
    .map((s) => (s ? s.trim() : ""))
    .filter(Boolean),
};
