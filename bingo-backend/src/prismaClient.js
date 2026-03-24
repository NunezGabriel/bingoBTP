process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
  process.exit(1);
});

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

console.log(
  "DATABASE_URL:",
  process.env.DATABASE_URL ? "OK (definida)" : "FALTA - no está en .env",
);

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL no esta definido en variables de entorno.");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma =
  globalThis.__prismaClient ||
  new PrismaClient({
    adapter,
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prismaClient = prisma;
}

module.exports = prisma;
