/**
 * Datos iniciales de Bingo GDG.
 *
 *   npm run seed            -> crea un evento de ejemplo si no hay ninguno (no borra nada)
 *   npm run seed -- --reset -> BORRA TODO (jugadores, eventos, rondas, puntos). Solo desarrollo.
 *
 * Las preguntas del bingo no se cargan aqui: estan en src/content/bingo.js.
 * Al panel admin se entra con ADMIN_CODE, no hay cuenta de admin.
 */
require("dotenv").config({ quiet: true });
const { prisma, pool } = require("../src/lib/prisma");

async function reset() {
  const tables = ["Cell", "Card", "Round", "PointLedger", "EventPlayer", "Event", "Player"];
  await prisma.$executeRawUnsafe(
    `TRUNCATE ${tables.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`,
  );
  console.log("Base de datos vaciada.");
}

async function main() {
  if (process.argv.includes("--reset")) {
    if (process.env.NODE_ENV === "production" && !process.argv.includes("--yes")) {
      throw new Error("Para resetear en produccion agrega --yes. Esto borra TODO.");
    }
    await reset();
  }

  const events = await prisma.event.count();
  if (events > 0) {
    console.log(`Eventos: ya existen ${events}, no se crea el de ejemplo.`);
    return;
  }
  const event = await prisma.event.create({ data: { name: "DevFest Arequipa 2026" } });
  console.log(`Evento de ejemplo "${event.name}" creado (sin abrir).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
