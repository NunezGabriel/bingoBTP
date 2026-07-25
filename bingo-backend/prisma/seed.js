require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Preguntas del Bingo I/O Extended: mezcla de stack Google, comunidad,
// networking real y rompehielos.
const PREGUNTAS = [
  // --- Comunidad y evento ---
  "Encuentra a alguien que venga por primera vez a un evento de GDG",
  "Encuentra a alguien que haya viajado desde fuera de Arequipa",
  "Encuentra a alguien de otra universidad o instituto",
  "Encuentra a alguien que te recomiende una charla de hoy",
  "Encuentra a alguien que quiera dar una charla algún día",

  // --- Stack y tecnología Google ---
  "Encuentra a alguien que desarrolle apps Android",
  "Encuentra a alguien que haya usado Flutter",
  "Encuentra a alguien que ya haya probado Gemini",
  "Encuentra a alguien que use Firebase en algún proyecto",
  "Encuentra a alguien que haya desplegado algo en la nube",
  "Encuentra a alguien que trabaje en frontend o desarrollo web",
  "Encuentra a alguien que trabaje con datos o analítica",
  "Encuentra a alguien que esté construyendo algo con IA",
  "Encuentra a alguien que sepa un lenguaje de programación que tú no",
  "Encuentra a alguien que haya contribuido a un proyecto open source",

  // --- Networking y oportunidades ---
  "Encuentra a alguien con quien intercambiar LinkedIn o GitHub",
  "Encuentra a alguien que busque equipo para un proyecto",
  "Encuentra a alguien que quiera emprender o ya tenga una startup",
  "Encuentra a alguien que sepa qué es el venture capital",
  "Encuentra a alguien que pueda enseñarte algo en dos minutos",
  "Encuentra a alguien que te dé un consejo profesional",

  // --- Rompehielos ---
  "Encuentra a alguien que haya participado en una hackathon",
  "Encuentra a alguien que te cuente su bug más raro",
  "Encuentra a alguien que haya trasnochado programando",
  "Encuentra a alguien que tome más café que tú",
];

// Por defecto solo actualiza las preguntas (no toca usuarios, rondas ni firmas).
// Con --reset borra todo y arranca de cero: usar solo antes del evento.
const shouldReset = process.argv.includes("--reset");

async function main() {
  if (shouldReset) {
    console.log("Modo --reset: borrando usuarios, rondas, cartillas y firmas.");
    await prisma.firma.deleteMany();
    await prisma.relacionCasilla.deleteMany();
    await prisma.cartilla.deleteMany();
    await prisma.usuario.deleteMany();
    await prisma.ronda.deleteMany();
    await prisma.casilla.deleteMany();
  }

  // Upsert por numero (que es unico): reescribe el texto sin romper las
  // cartillas ya repartidas ni las firmas existentes.
  for (const [index, pregunta] of PREGUNTAS.entries()) {
    const numero = index + 1;
    await prisma.casilla.upsert({
      where: { numero },
      update: { pregunta },
      create: { numero, pregunta },
    });
  }

  // Casillas sobrantes de temáticas anteriores: se eliminan solo si nadie
  // las está usando, para no romper cartillas en juego.
  const sobrantes = await prisma.casilla.findMany({
    where: { numero: { gt: PREGUNTAS.length } },
    include: { _count: { select: { cartillas: true, firmas: true } } },
  });
  const borrables = sobrantes.filter(
    (c) => c._count.cartillas === 0 && c._count.firmas === 0,
  );
  if (borrables.length > 0) {
    await prisma.casilla.deleteMany({
      where: { id: { in: borrables.map((c) => c.id) } },
    });
  }
  const enUso = sobrantes.length - borrables.length;

  const rondaActiva = await prisma.ronda.findFirst({ where: { activa: true } });
  if (!rondaActiva) {
    await prisma.ronda.create({
      data: { nombre: "Ronda Inicial", activa: true },
    });
    console.log("Ronda activa creada: 'Ronda Inicial'.");
  }

  console.log(`Seed completado: ${PREGUNTAS.length} casillas cargadas.`);
  if (borrables.length > 0) {
    console.log(`Casillas antiguas eliminadas: ${borrables.length}.`);
  }
  if (enUso > 0) {
    console.log(
      `Aviso: ${enUso} casillas antiguas siguen en uso por cartillas activas y no se borraron.`,
    );
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
