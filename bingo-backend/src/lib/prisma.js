const { PrismaClient, Prisma } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const config = require("../config");

if (!config.databaseUrl) {
  throw new Error("DATABASE_URL no esta definido en variables de entorno.");
}

const pool = new Pool({
  connectionString: config.databaseUrl,
  max: config.dbPoolMax,
});

const prisma =
  globalThis.__prismaClient ||
  new PrismaClient({
    adapter: new PrismaPg(pool),
    // Sin "error": los conflictos esperados (nombre repetido, doble respuesta)
    // se manejan en el codigo, y los inesperados ya los registra el manejador
    // global de Express con la ruta que fallo.
    log: ["warn"],
  });

if (!config.isProduction) {
  globalThis.__prismaClient = prisma;
}

/** Errores de Prisma que conviene reconocer por codigo. */
function isUniqueViolation(error) {
  return error?.code === "P2002";
}

module.exports = { prisma, Prisma, pool, isUniqueViolation };
