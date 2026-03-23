const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {

  // 👤 usuarios
  await prisma.usuario.createMany({
    data: [
      { nombre: 'Ana', codigo: 'A1', tipo: 'participant' },
      { nombre: 'Luis', codigo: 'L1', tipo: 'participant' },
      { nombre: 'Marta', codigo: 'M1', tipo: 'participant' }
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

  const cartilla = await prisma.cartilla.create({
    data: {
      participantId: user.id,
      rondaId: ronda.id

    }
  });

  const ronda = await prisma.ronda.create({
    data: { nombre: 'Ronda 1' }
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

  console.log('🌱 Seed completado');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());