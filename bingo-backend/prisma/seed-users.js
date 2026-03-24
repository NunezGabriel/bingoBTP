require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TEST_USERS = [
  { nombre: "Ana Torres", codigo: "AN01", tipo: "PARTICIPANT" },
  { nombre: "Belen Rojas", codigo: "BE02", tipo: "PARTICIPANT" },
  { nombre: "Carla Pineda", codigo: "CA03", tipo: "PARTICIPANT" },
  { nombre: "Daniela Salas", codigo: "DA04", tipo: "PARTICIPANT" },
  { nombre: "Elena Quispe", codigo: "EL05", tipo: "PARTICIPANT" },
  { nombre: "Fabiola Mena", codigo: "FA06", tipo: "PARTICIPANT" },
  { nombre: "Gabriela Rios", codigo: "GA07", tipo: "PARTICIPANT" },
  { nombre: "Hilda Valdez", codigo: "HI08", tipo: "PARTICIPANT" },
  { nombre: "Ines Poma", codigo: "IN09", tipo: "PARTICIPANT" },
  { nombre: "Julia Luna", codigo: "JU10", tipo: "PARTICIPANT" },
  { nombre: "Karen Soto", codigo: "KA11", tipo: "PARTICIPANT" },
  { nombre: "Laura Vega", codigo: "LA12", tipo: "PARTICIPANT" },
  { nombre: "Admin Bingo", codigo: "AD00", tipo: "ADMIN" },
];

async function main() {
  const result = await prisma.usuario.createMany({
    data: TEST_USERS,
    skipDuplicates: true,
  });

  console.log(
    `Seed usuarios completado: ${result.count} nuevos insertados, ${TEST_USERS.length} totales en lista.`,
  );
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

