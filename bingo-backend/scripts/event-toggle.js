/**
 * Pausa y reanuda el evento abierto, solo en la base LOCAL.
 *
 * Existe por una razon muy concreta: `npm test` y `npm run loadtest` se niegan
 * a correr con un evento abierto, y cerrarlo desde el panel NO tiene vuelta
 * atras ("Ese evento ya se cerro; crea uno nuevo"). Eso deja el evento de
 * pruebas inservible y hay que rehacerlo.
 *
 * Esto lo deja en DRAFT, que si se puede volver a abrir.
 *
 *   npm run pausa   -> el evento abierto pasa a DRAFT
 *   npm run sigue   -> el ultimo DRAFT vuelve a LIVE
 */
require("dotenv/config");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const url = process.env.DATABASE_URL ?? "";
if (!/localhost|127\.0\.0\.1/.test(url)) {
  console.error("Esto solo corre contra la base local. DATABASE_URL apunta a otro sitio.");
  process.exit(1);
}

const accion = process.argv[2];
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

(async () => {
  if (accion === "pausa") {
    const live = await prisma.event.findFirst({ where: { status: "LIVE" } });
    if (!live) return console.log("No hay ningun evento abierto.");
    await prisma.event.update({ where: { id: live.id }, data: { status: "DRAFT" } });
    console.log(`Pausado: "${live.name}". Con "npm run sigue" vuelve.`);
    return;
  }

  if (accion === "sigue") {
    const otro = await prisma.event.findFirst({ where: { status: "LIVE" } });
    if (otro) return console.log(`"${otro.name}" ya esta abierto.`);
    const draft = await prisma.event.findFirst({
      where: { status: "DRAFT" },
      orderBy: { id: "desc" },
    });
    if (!draft) return console.log("No hay ningun evento en borrador que reabrir.");
    await prisma.event.update({ where: { id: draft.id }, data: { status: "LIVE" } });
    console.log(`Abierto de nuevo: "${draft.name}".`);
    return;
  }

  console.error("Uso: node scripts/event-toggle.js pausa|sigue");
  process.exit(1);
})()
  .catch((e) => {
    console.error("ERROR:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
