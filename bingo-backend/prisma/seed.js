require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const PREGUNTAS = [
  "Encuentra a alguien con quien intercambiar contacto profesional",
  "Encuentra a alguien que busque socios para un proyecto",
  "Encuentra a alguien que quiera aprender algo que tu sabes",
  "Encuentra a alguien que pueda ensenarte algo util",
  "Encuentra a alguien con experiencia laboral",
  "Encuentra a alguien que quiera emprender",
  "Encuentra a alguien con una idea de negocio",
  "Encuentra a alguien que haya participado en un proyecto real",
  "Encuentra a alguien que quiera trabajar en el extranjero",
  "Encuentra a alguien que quiera liderar equipos",
  "Encuentra a alguien que sepa programar",
  "Encuentra a alguien que domine Excel o analisis de datos",
  "Encuentra a alguien que haya usado inteligencia artificial",
  "Encuentra a alguien interesado en startups",
  "Encuentra a alguien que prefiera datos sobre creatividad o viceversa",
  "Encuentra a alguien que haya trasnochado por estudios",
  "Encuentra a alguien que procrastino hoy",
  "Encuentra a alguien que haya fingido entender algo",
  "Encuentra a alguien que se considere desorganizado",
  "Encuentra a alguien que ame el cafe",
  "Encuentra a alguien que te cuente su mayor error profesional",
  "Encuentra a alguien que te diga su meta este ano",
  "Encuentra a alguien que cambiaria de carrera",
  "Encuentra a alguien que te de un consejo profesional",
  "Encuentra a alguien con quien harias un proyecto hoy mismo",
];

async function main() {
  // Limpia todo lo relacionado a partidas/casillas para arrancar en limpio.
  await prisma.firma.deleteMany();
  await prisma.relacionCasilla.deleteMany();
  await prisma.cartilla.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.ronda.deleteMany();
  await prisma.casilla.deleteMany();

  await prisma.casilla.createMany({
    data: PREGUNTAS.map((pregunta, index) => ({
      numero: index + 1,
      pregunta,
    })),
  });

  await prisma.ronda.create({
    data: {
      nombre: "Ronda Inicial",
      activa: true,
    },
  });

  console.log(`Seed completado: ${PREGUNTAS.length} casillas cargadas.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });