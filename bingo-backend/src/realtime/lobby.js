const { WebSocketServer } = require("ws");
const config = require("../config");
const { readTicket } = require("../lib/session");
const { getPlayer } = require("../services/players");
const { normalizeSkin } = require("../content/skins");

/**
 * El lobby: donde la gente espera entre rondas, se mueve y saluda.
 *
 * Va por WebSocket y no por SSE porque aqui el celular tambien habla (manda su
 * posicion), y SSE es de una sola via. La conexion solo existe mientras alguien
 * esta en la pantalla del lobby: al empezar la ronda todos se van a su cartilla
 * y estas conexiones se cierran solas.
 *
 * Nada de esto se guarda: si el servidor se reinicia, cada quien reaparece.
 *
 * Como aguanta 300 personas:
 *   - Se arma UNA sola foto por tick y se manda igual a todos, en vez de
 *     armar un mensaje distinto por persona.
 *   - Si hay mas gente que VISIBLE_MAX, la foto lleva solo a los que se han
 *     movido hace menos, mas la cuenta de cuantos hay en total.
 *
 * Hubo una cuadricula: cada quien recibia solo su casilla y las ocho de
 * alrededor. Se quito porque el escenario mide 1800x840 y en pantalla se ve
 * casi entero, asi que ese recorte hacia desaparecer a gente que el jugador
 * seguia teniendo delante. Y la foto compartida ademas sale mas barata.
 */

const WORLD = { w: config.lobby.width, h: config.lobby.height };
/** Cuanta gente se dibuja como mucho. El contador sigue diciendo la verdad. */
const VISIBLE_MAX = 120;
const TICK_MS = Math.round(1000 / Math.max(1, Math.min(10, config.lobby.snapshotHz)));
const MOVE_MIN_MS = 50; // como mucho 20 posiciones por segundo por persona
const IDLE_MS = 90_000;

/** playerId -> estado en el lobby */
const people = new Map();
let server = null;
let timer = null;

const clamp = (v, max) => (Number.isFinite(v) ? Math.max(0, Math.min(max, Math.round(v))) : 0);

function send(ws, data) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(data));
}

/** Como se ve alguien al entrar: con nombre y personaje. */
const fullView = (p) => ({ id: p.id, name: p.name, skin: p.skin, x: p.x, y: p.y, d: p.d });
/** Como viaja en cada foto: solo numeros. */
const tickView = (p) => [p.id, p.x, p.y, p.d, p.w ? 1 : 0, p.emote ? 1 : 0];

function broadcastAll(data) {
  const text = JSON.stringify(data);
  for (const p of people.values()) {
    if (p.ws.readyState === p.ws.OPEN) p.ws.send(text);
  }
}

/** Una sola foto por tick, la misma para todos. */
function tick() {
  if (!people.size) return;

  let gente = [...people.values()];
  if (gente.length > VISIBLE_MAX) {
    // Si no caben todos, se quedan los que se movieron hace menos: a quien
    // lleva rato quieto en una esquina es a quien menos se echa de menos.
    gente = gente.sort((a, b) => b.movedAt - a.movedAt).slice(0, VISIBLE_MAX);
  }

  const text = JSON.stringify({
    t: "s",
    p: gente.map(tickView),
    /** Cuantos hay en el lobby en total, aunque no se dibujen todos. */
    n: people.size,
  });
  for (const p of people.values()) {
    if (p.ws.readyState === p.ws.OPEN) p.ws.send(text);
  }

  // El saludo dura un solo tick: se apaga despues de mandarlo.
  for (const p of people.values()) p.emote = false;
}

function cleanup() {
  const now = Date.now();
  for (const p of people.values()) {
    if (now - p.seenAt > IDLE_MS) p.ws.close(4000, "inactivo");
  }
}

function handleMessage(person, raw) {
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch {
    return;
  }
  person.seenAt = Date.now();

  if (msg.t === "m") {
    // Freno por si alguien manda posiciones mas rapido de lo humano.
    if (person.seenAt - person.movedAt < MOVE_MIN_MS) return;
    person.movedAt = person.seenAt;
    person.x = clamp(msg.x, WORLD.w);
    person.y = clamp(msg.y, WORLD.h);
    person.d = [0, 1, 2, 3].includes(msg.d) ? msg.d : person.d;
    person.w = Boolean(msg.w);
    return;
  }

  if (msg.t === "e") {
    if (person.seenAt - person.emoteAt < config.lobby.emoteCooldownMs) {
      send(person.ws, {
        t: "wait",
        ms: config.lobby.emoteCooldownMs - (person.seenAt - person.emoteAt),
      });
      return;
    }
    person.emoteAt = person.seenAt;
    person.emote = true;
  }
}

async function onConnection(ws, req) {
  let ticket = null;
  try {
    ticket = readTicket(new URL(req.url, "http://x").searchParams.get("ticket"));
  } catch {
    ticket = null;
  }
  if (!ticket) return ws.close(4001, "sin ticket");

  const player = await getPlayer(ticket.p);
  if (!player || player.sessionVersion !== ticket.v) return ws.close(4001, "sesion vencida");
  // El admin no entra al lobby: no juega.
  if (player.role !== "PLAYER") return ws.close(4003, "cuenta de administracion");
  if (ws.readyState !== ws.OPEN) return;

  // Si ya estaba conectado (otra pestana, reconexion), se queda la nueva.
  const previo = people.get(player.id);
  if (previo) {
    previo.ws.close(4002, "conectado en otro lado");
    people.delete(player.id);
  }

  const now = Date.now();
  const person = {
    id: player.id,
    name: player.name,
    skin: normalizeSkin(player.skin),
    ws,
    // Aparece delante de la pileta, no encima, y repartido para que no se
    // amontonen todos en el mismo pixel cuando entran de golpe.
    x: Math.round(WORLD.w / 2 + (Math.random() * 700 - 350)),
    y: Math.round(WORLD.h * 0.9 + (Math.random() * 50 - 25)),
    d: 0,
    w: false,
    emote: false,
    emoteAt: 0,
    movedAt: 0,
    seenAt: now,
  };
  people.set(player.id, person);

  send(ws, {
    t: "welcome",
    you: fullView(person),
    world: WORLD,
    cooldown: config.lobby.emoteCooldownMs,
    players: [...people.values()].filter((p) => p.id !== person.id).map(fullView),
  });
  broadcastAll({ t: "join", player: fullView(person) });

  ws.on("message", (data) => handleMessage(person, data));
  ws.on("pong", () => {
    person.seenAt = Date.now();
  });
  ws.on("close", () => {
    if (people.get(player.id) === person) {
      people.delete(player.id);
      broadcastAll({ t: "leave", id: player.id });
    }
  });
  ws.on("error", () => ws.close());
}

function attach(httpServer) {
  if (server) return server;
  server = new WebSocketServer({ server: httpServer, path: "/ws/lobby", maxPayload: 1024 });
  server.on("connection", (ws, req) => {
    onConnection(ws, req).catch((error) => {
      console.error("lobby: conexion rechazada:", error.message);
      try {
        ws.close(4500, "error");
      } catch {
        /* ya estaba cerrado */
      }
    });
  });

  timer = setInterval(tick, TICK_MS);
  timer.unref();
  const beat = setInterval(() => {
    cleanup();
    for (const p of people.values()) {
      if (p.ws.readyState === p.ws.OPEN) p.ws.ping();
    }
  }, 30_000);
  beat.unref();

  return server;
}

/** Cuantos hay ahora mismo en el lobby (lo muestra el panel del admin). */
const count = () => people.size;

module.exports = { attach, count, broadcastAll };
