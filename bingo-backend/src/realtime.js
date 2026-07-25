const { obtenerProgresoActual } = require("./services/progresoService");

/**
 * Hub de Server-Sent Events para el panel admin.
 *
 * Se usa SSE y no WebSockets porque el frontend llega al backend a traves
 * del rewrite /api de Vercel, que no hace proxy del upgrade de WebSocket.
 * SSE viaja sobre HTTP normal: pasa por el proxy, reusa la cookie de sesion
 * y EventSource reconecta solo.
 */
const clientes = new Set();

// Los eventos se agrupan: si 30 personas firman a la vez se calcula y
// difunde un unico snapshot, no 30.
const INTERVALO_COALESCENCIA_MS = 800;
const HEARTBEAT_MS = 25000;

let timerPendiente = null;
let difusionEnCurso = false;
let hayCambioPendiente = false;

function escribirEvento(res, evento, data) {
  try {
    res.write(`event: ${evento}\ndata: ${JSON.stringify(data)}\n\n`);
  } catch {
    clientes.delete(res);
  }
}

function suscribir(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    // no-transform y X-Accel-Buffering evitan que proxies intermedios
    // (Vercel, nginx de Render) hagan buffer y retrasen los eventos.
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();

  clientes.add(res);

  // Snapshot inmediato para que el panel pinte sin esperar al primer cambio.
  enviarSnapshot(res);

  const heartbeat = setInterval(() => {
    // Comentario SSE: mantiene viva la conexion sin disparar onmessage.
    try {
      res.write(": ping\n\n");
    } catch {
      clearInterval(heartbeat);
      clientes.delete(res);
    }
  }, HEARTBEAT_MS);

  req.on("close", () => {
    clearInterval(heartbeat);
    clientes.delete(res);
  });
}

async function enviarSnapshot(res) {
  try {
    const progreso = await obtenerProgresoActual();
    escribirEvento(res, progreso ? "progreso" : "sin-ronda", progreso ?? {});
  } catch (error) {
    console.error("SSE: error construyendo snapshot inicial:", error.message);
  }
}

async function difundirAhora() {
  if (clientes.size === 0) return;

  try {
    const progreso = await obtenerProgresoActual();
    const evento = progreso ? "progreso" : "sin-ronda";
    for (const res of clientes) {
      escribirEvento(res, evento, progreso ?? {});
    }
  } catch (error) {
    console.error("SSE: error difundiendo progreso:", error.message);
  }
}

/**
 * Avisa que el estado cambio (firma, ronda nueva, borrado de usuarios).
 * Agrupa llamadas seguidas en una sola difusion.
 */
function notificarCambio() {
  if (clientes.size === 0) return;

  if (difusionEnCurso) {
    hayCambioPendiente = true;
    return;
  }
  if (timerPendiente) return;

  timerPendiente = setTimeout(async () => {
    timerPendiente = null;
    difusionEnCurso = true;
    try {
      await difundirAhora();
    } finally {
      difusionEnCurso = false;
      if (hayCambioPendiente) {
        hayCambioPendiente = false;
        notificarCambio();
      }
    }
  }, INTERVALO_COALESCENCIA_MS);

  timerPendiente.unref?.();
}

module.exports = { suscribir, notificarCambio, totalClientes: () => clientes.size };
