require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {

  // 👤 usuarios
  await prisma.usuario.createMany({
    data: [
      { nombre: "Ana", codigo: "AN12", tipo: "PARTICIPANT" },
      { nombre: "Luis", codigo: "LU77", tipo: "PARTICIPANT" },
      { nombre: "Marta", codigo: "MA88", tipo: "PARTICIPANT" }
    ]
  });

  // 🔢 casillas
  const casillas = await prisma.casilla.createMany({
    data: Array.from({ length: 9 }, (_, i) => ({
      numero: i + 1,
      pregunta: `Pregunta ${i + 1}`
    }))
  });

  // 🎟️ cartilla
  const user = await prisma.usuario.findFirst();

  const ronda = await prisma.ronda.create({
    data: { nombre: "Ronda 1" }
  });

  const cartilla = await prisma.cartilla.create({
    data: {
      participantId: user.id,
      rondaId: ronda.id
    }
  });

  // 🔗 asignar casillas
  const todasCasillas = await prisma.casilla.findMany();

  for (const c of todasCasillas) {
    await prisma.relacionCasilla.create({
      data: {
        cartillaId: cartilla.id,
        casillaId: c.id
      }
    });
  }

  console.log("Seed completado");
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });