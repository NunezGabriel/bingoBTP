const { prisma } = require("./prisma");

/**
 * Transaccion con callbacks "al confirmar".
 *
 * Las notificaciones en tiempo real (puntos, ranking) solo deben salir
 * si la transaccion se confirmo. Si se publicaran adentro y luego hubiera
 * rollback, el jugador veria "+50" por algo que nunca quedo guardado.
 */
async function withTx(fn, { timeout = 20_000 } = {}) {
  const afterCommit = [];
  const result = await prisma.$transaction(
    (tx) => fn(tx, (cb) => afterCommit.push(cb)),
    { maxWait: 10_000, timeout },
  );
  for (const cb of afterCommit) {
    try {
      await cb();
    } catch (error) {
      console.error("tx: error en callback post-commit:", error);
    }
  }
  return result;
}

module.exports = { withTx };
