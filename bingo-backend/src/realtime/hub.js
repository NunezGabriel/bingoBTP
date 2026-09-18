const crypto = require("node:crypto");

/**
 * Hub de Server-Sent Events.
 *
 * Por que SSE y no WebSockets: el frontend en Vercel llega al backend por un
 * rewrite /api, y ese proxy no transporta el upgrade de WebSocket. SSE viaja
 * sobre HTTP normal, reusa la cookie de sesion y el navegador reconecta solo.
 *
 * Reconexiones baratas: cada evento lleva un id "<arranque>-<secuencia>".
 * Al reconectar, EventSource manda Last-Event-ID y el hub reenvia solo lo que
 * el cliente se perdio desde un buffer en memoria. Si ya no alcanza (servidor
 * reiniciado o corte muy largo) manda "resync" y el cliente recarga su estado
 * UNA vez. Asi 500 celulares reconectando no se convierten en 500 consultas.
 */

const BOOT = crypto.randomBytes(4).toString("hex");
const BUFFER_SIZE = 4000;
const HEARTBEAT_MS = 25_000;

let seq = 0;
/** @type {{ seq: number, channels: string[], frame: string }[]} */
const buffer = [];
/** @type {Map<string, Set<object>>} */
const byChannel = new Map();
let clientCount = 0;

function frameFor(id, type, data) {
  return `id: ${id}\nevent: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

function write(client, frame) {
  if (client.closed) return;
  try {
    client.res.write(frame);
  } catch {
    close(client);
  }
}

function close(client) {
  if (client.closed) return;
  client.closed = true;
  clearInterval(client.heartbeat);
  for (const ch of client.channels) {
    const set = byChannel.get(ch);
    if (!set) continue;
    set.delete(client);
    if (set.size === 0) byChannel.delete(ch);
  }
  clientCount -= 1;
}

function currentId() {
  return `${BOOT}-${seq}`;
}

/**
 * Abre el stream de un cliente suscrito a los canales indicados.
 * Canales: "all", "player:<id>", "staff", "admin", "screen".
 */
function subscribe(req, res, channels) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    // no-transform y X-Accel-Buffering: que ningun proxy (Vercel, nginx)
    // acumule la respuesta y retrase los eventos.
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  req.socket.setTimeout(0);
  req.socket.setNoDelay(true);
  // Reintento sugerido al navegador si se corta la conexion.
  res.write("retry: 3000\n\n");

  const client = { res, channels: new Set(channels), closed: false };
  for (const ch of client.channels) {
    if (!byChannel.has(ch)) byChannel.set(ch, new Set());
    byChannel.get(ch).add(client);
  }
  clientCount += 1;

  const lastEventId =
    req.headers["last-event-id"] || req.query?.lastEventId || null;
  replayOrResync(client, lastEventId);

  client.heartbeat = setInterval(() => write(client, ": ping\n\n"), HEARTBEAT_MS);
  req.on("close", () => close(client));
}

function replayOrResync(client, lastEventId) {
  if (!lastEventId) {
    // Primera conexion: el cliente ya pidio su estado por REST. Solo le damos
    // una marca de posicion para que futuras reconexiones sepan desde donde seguir.
    write(client, frameFor(currentId(), "hello", { boot: BOOT }));
    return;
  }

  const [boot, rawSeq] = String(lastEventId).split("-");
  const lastSeq = Number(rawSeq);
  const oldest = buffer.length ? buffer[0].seq : seq + 1;
  const canReplay =
    boot === BOOT &&
    Number.isInteger(lastSeq) &&
    lastSeq <= seq &&
    lastSeq >= oldest - 1;

  if (!canReplay) {
    write(client, frameFor(currentId(), "resync", { boot: BOOT }));
    return;
  }

  for (const entry of buffer) {
    if (entry.seq <= lastSeq) continue;
    if (entry.channels.some((ch) => client.channels.has(ch))) {
      write(client, entry.frame);
    }
  }
}

/**
 * Publica un evento. `ephemeral` = no se guarda para reenviar al reconectar
 * (sirve para snapshots que igual se vuelven a mandar, como el ranking).
 */
function publish(channels, type, data, { ephemeral = false } = {}) {
  const list = Array.isArray(channels) ? channels : [channels];
  seq += 1;
  const frame = frameFor(`${BOOT}-${seq}`, type, data);

  if (!ephemeral) {
    buffer.push({ seq, channels: list, frame });
    if (buffer.length > BUFFER_SIZE) buffer.splice(0, buffer.length - BUFFER_SIZE);
  }

  const delivered = new Set();
  for (const ch of list) {
    const set = byChannel.get(ch);
    if (!set) continue;
    for (const client of set) {
      if (delivered.has(client)) continue;
      delivered.add(client);
      write(client, frame);
    }
  }
}

const toPlayer = (playerId, type, data, opts) =>
  publish(`player:${playerId}`, type, data, opts);

function stats() {
  return {
    connections: clientCount,
    screens: byChannel.get("screen")?.size ?? 0,
    buffered: buffer.length,
  };
}

/**
 * Agrupa disparos seguidos: `fn` corre como mucho una vez por intervalo y,
 * si alguien lo pide mientras corre, se agenda una ejecucion final.
 */
function coalesce(fn, intervalMs) {
  let timer = null;
  let running = false;
  let pending = false;

  const run = async () => {
    timer = null;
    running = true;
    try {
      await fn();
    } catch (error) {
      console.error("realtime: error en tarea agrupada:", error.message);
    } finally {
      running = false;
      if (pending) {
        pending = false;
        trigger();
      }
    }
  };

  function trigger() {
    if (running) {
      pending = true;
      return;
    }
    if (timer) return;
    timer = setTimeout(run, intervalMs);
    timer.unref?.();
  }

  return trigger;
}

module.exports = { subscribe, publish, toPlayer, stats, coalesce };
