/**
 * Datos iniciales de Bingo GDG.
 *
 *   npm run seed            -> crea la cuenta de admin y un evento de ejemplo
 *   npm run seed -- --reset -> BORRA TODO (jugadores, eventos, rondas, puntos)
 *
 * La cuenta de admin no se puede crear desde la app: sale de aqui, con
 * ADMIN_USER y ADMIN_CLAVE del entorno. Si ya existe, solo se le actualiza la
 * clave, que es la forma de recuperarla si alguien la olvido.
 *
 * Las preguntas del bingo, las misiones y los personajes estan en src/content/.
 */
require("dotenv").config({ quiet: true });
const config = require("../src/config");
const { prisma, pool } = require("../src/lib/prisma");
const { hashPin } = require("../src/lib/pin");
const { newPlayerCode } = require("../src/lib/codes");

async function reset() {
  const tables = [
    "MissionClaim",
    "Cell",
    "Card",
    "Round",
    "PointLedger",
    "EventPlayer",
    "Event",
    "Player",
  ];
  await prisma.$executeRawUnsafe(
    `TRUNCATE ${tables.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`,
  );
  console.log("Base de datos vaciada.");
}

async function ensureAdmin() {
  if (!config.adminClave) {
    console.warn("Sin ADMIN_CLAVE: no se creo la cuenta de admin.");
    return;
  }
  const name = config.adminUser;
  const nameKey = name.normalize("NFC").toLowerCase();
  const claveHash = await hashPin(config.adminClave);

  const existing = await prisma.player.findUnique({ where: { nameKey } });
  if (existing) {
    await prisma.player.update({
      where: { id: existing.id },
      // Se le sube la version de sesion para cerrar las abiertas con la clave vieja.
      data: { claveHash, role: "ADMIN", sessionVersion: { increment: 1 } },
    });
    console.log(`Admin "${name}": clave actualizada.`);
    return;
  }

  await prisma.player.create({
    data: { name, nameKey, claveHash, role: "ADMIN", code: newPlayerCode() },
  });
  console.log(`Admin "${name}" creado.`);
}

async function main() {
  if (process.argv.includes("--reset")) {
    if (process.env.NODE_ENV === "production" && !process.argv.includes("--yes")) {
      throw new Error("Para resetear en produccion agrega --yes. Esto borra TODO.");
    }
    await reset();
  }

  await ensureAdmin();

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
