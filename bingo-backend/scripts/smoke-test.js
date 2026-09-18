/**
 * Prueba de punta a punta de la API contra un servidor corriendo.
 *
 *   npm test        (usa API_URL, ADMIN_NICKNAME y ADMIN_PIN del .env)
 *
 * Crea sus propios eventos y jugadores, recorre el juego completo y al final
 * borra todo lo que creo. NO la corras contra produccion: se niega si hay un
 * evento real abierto.
 */
require("dotenv").config({ quiet: true });

const MISSIONS = require("../src/content/missions");
const BINGO = require("../src/content/bingo");

const API = (process.env.API_URL || "http://localhost:3001").replace(/\/$/, "");
const ADMIN = { nickname: process.env.ADMIN_NICKNAME, pin: process.env.ADMIN_PIN };
const RUN = Date.now().toString(36).slice(-5);

let passed = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  ok  ${name}`);
  } else {
    failures.push(name);
    console.log(`  MAL ${name}${detail !== undefined ? ` -> ${JSON.stringify(detail)}` : ""}`);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Cliente con su propio "tarro" de cookies: cada instancia es un celular distinto. */
class Device {
  constructor(label) {
    this.label = label;
    this.cookies = new Map();
    this.events = [];
  }

  cookieHeader() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  async req(method, path, body, { csrf = true } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (csrf) headers["x-mq"] = "1";
    if (this.cookies.size) headers.Cookie = this.cookieHeader();
    const res = await fetch(`${API}/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const raw of res.headers.getSetCookie?.() ?? []) {
      const [pair] = raw.split(";");
      const eq = pair.indexOf("=");
      const name = pair.slice(0, eq);
      const value = pair.slice(eq + 1);
      if (!value || /max-age=0|expires=thu, 01 jan 1970/i.test(raw)) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { status: res.status, data };
  }

  get = (p) => this.req("GET", p);
  post = (p, b = {}) => this.req("POST", p, b);
  patch = (p, b = {}) => this.req("PATCH", p, b);
  del = (p) => this.req("DELETE", p);

  /** Abre el stream SSE y acumula eventos en this.events. */
  async openStream({ lastEventId, screen = false } = {}) {
    this.events = [];
    this.abort = new AbortController();
    const headers = { Accept: "text/event-stream" };
    if (this.cookies.size) headers.Cookie = this.cookieHeader();
    if (lastEventId) headers["Last-Event-ID"] = lastEventId;
    const res = await fetch(`${API}/api/stream${screen ? "?screen=1" : ""}`, {
      headers,
      signal: this.abort.signal,
    });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    (async () => {
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let idx;
          while ((idx = buffer.indexOf("\n\n")) >= 0) {
            const chunk = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            const evt = { type: "message", data: "", id: null };
            for (const line of chunk.split("\n")) {
              if (line.startsWith("event: ")) evt.type = line.slice(7);
              else if (line.startsWith("data: ")) evt.data += line.slice(6);
              else if (line.startsWith("id: ")) evt.id = line.slice(4);
            }
            if (evt.data) {
              try {
                evt.data = JSON.parse(evt.data);
              } catch {
                /* texto plano */
              }
              this.events.push(evt);
            }
          }
        }
      } catch {
        /* cerrado */
      }
    })();
    await sleep(300);
    return res.status;
  }

  closeStream() {
    this.abort?.abort();
  }

  lastId() {
    return [...this.events].reverse().find((e) => e.id)?.id ?? null;
  }

  find(type, predicate = () => true) {
    return this.events.find((e) => e.type === type && predicate(e.data));
  }
}

async function waitFor(fn, timeoutMs = 4000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const value = fn();
    if (value) return value;
    await sleep(100);
  }
  return fn();
}

const created = { players: [], events: [] };

async function register(label, house, avatarClass = "esqueleto") {
  const device = new Device(label);
  const r = await device.post("/auth/register", {
    nickname: `smk${RUN}${label}`,
    pin: "1234",
    avatarClass,
    avatarHouse: house,
  });
  if (r.status !== 201) throw new Error(`registro ${label}: ${r.status} ${JSON.stringify(r.data)}`);
  device.player = r.data.player;
  created.players.push(device.player.id);
  return device;
}

const houseMap = (houses) => Object.fromEntries(houses.map((h) => [h.house, h.players]));

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("No corras la prueba en produccion");
  if (!ADMIN.nickname || !ADMIN.pin) throw new Error("Define ADMIN_NICKNAME y ADMIN_PIN");

  console.log(`\nPrueba de humo contra ${API} (corrida ${RUN})\n`);

  console.log("[seguridad basica]");
  const anon = new Device("anon");
  check("health responde", (await anon.get("/health")).status === 200);
  check("/me sin sesion -> 401", (await anon.get("/me")).status === 401);
  const noCsrf = await anon.req("POST", "/auth/login", { nickname: "x", pin: "1234" }, { csrf: false });
  check("escritura sin cabecera CSRF -> 403", noCsrf.status === 403, noCsrf);

  console.log("\n[admin: eventos]");
  const admin = new Device("admin");
  const login = await admin.post("/auth/login", ADMIN);
  check("login admin", login.status === 200 && login.data.player.role === "ADMIN", login);
  if (login.status !== 200) throw new Error("Sin admin no se puede seguir");

  const events = await admin.get("/admin/events");
  const live = events.data.events.find((e) => e.status === "LIVE");
  if (live && !live.name.startsWith("Smoke ")) {
    throw new Error(`"${live.name}" esta abierto. La prueba no toca eventos reales.`);
  }
  if (live) await admin.post(`/admin/events/${live.id}/close`);

  const eventA = await admin.post("/admin/events", { name: `Smoke A ${RUN}` });
  const eventB = await admin.post("/admin/events", { name: `Smoke B ${RUN}` });
  check("crear dos eventos", eventA.status === 201 && eventB.status === 201, [eventA, eventB]);
  const A = eventA.data.event.id;
  const B = eventB.data.event.id;
  created.events.push(A, B);

  const openA = await admin.post(`/admin/events/${A}/open`);
  check("abrir evento A", openA.status === 200 && openA.data.event.status === "LIVE", openA);
  check("no se pueden abrir dos eventos a la vez -> 409", (await admin.post(`/admin/events/${B}/open`)).status === 409);
  check("un evento abierto no se puede borrar -> 409", (await admin.del(`/admin/events/${A}`)).status === 409);
  const overview = await admin.get("/admin/events");
  check("el panel ve el evento abierto", overview.data.live?.id === A && overview.data.live.players === 0, overview.data.live);

  console.log("\n[registro y casas]");
  const empty = await anon.get("/public/event");
  check("al abrir, todas las casas empiezan en 0", empty.data.houses.every((h) => h.players === 0), empty.data);

  const houses = ["azul", "rojo", "amarillo", "verde", "azul", "rojo", "amarillo", "azul", "rojo", "azul"];
  const p = [];
  for (let i = 0; i < houses.length; i += 1) p.push(await register(`p${i}`, houses[i]));
  check("10 jugadores con codigo de 6", p.every((d) => d.player.code.length === 6));

  const counts = await anon.get("/public/event");
  check(
    "la portada muestra cuantos hay en cada casa",
    JSON.stringify(houseMap(counts.data.houses)) === JSON.stringify({ azul: 4, rojo: 3, amarillo: 2, verde: 1 }) &&
      counts.data.players === 10,
    counts.data,
  );

  const dup = await new Device("dup").post("/auth/register", {
    nickname: `SMK${RUN}P0`, pin: "1234", avatarClass: "mago", avatarHouse: "azul",
  });
  check("nombre duplicado (sin importar mayusculas) -> 409", dup.status === 409, dup);
  const dragon = await new Device("x").post("/auth/register", {
    nickname: `smk${RUN}drg`, pin: "1234", avatarClass: "dragon", avatarHouse: "azul",
  });
  check("clase bloqueada (dragon) no se elige al inicio -> 400", dragon.status === 400, dragon);

  const me0 = await p[0].get("/me");
  check("/me trae el evento abierto", me0.data.event?.id === A && me0.data.game === null, me0.data);
  const phone2 = new Device("p0-otro-celular");
  const relog = await phone2.post("/auth/login", { nickname: p[0].player.nickname, pin: "1234" });
  check("entrar desde otro celular recupera el mismo personaje", relog.data?.player?.id === p[0].player.id, relog);
  check("no se cambia de casa con el evento abierto -> 409", (await p[0].patch("/me/avatar", { avatarHouse: "verde" })).status === 409);

  console.log("\n[contactos por codigo]");
  await p[1].openStream();
  const code1 = p[1].player.code;
  const typed = `${code1.slice(0, 3).toLowerCase()} - ${code1.slice(3)}`;
  const add = await p[0].post("/me/contacts", { code: typed });
  check("agregar contacto escribiendo el codigo (minusculas, espacios, guion)", add.status === 201 && add.data.isNew, add);
  const addAgain = await p[0].post("/me/contacts", { code: code1 });
  check("repetir el contacto no lo duplica", addAgain.status === 200 && addAgain.data.isNew === false, addAgain);
  check("tu propio codigo -> 400", (await p[0].post("/me/contacts", { code: p[0].player.code })).status === 400);
  check("codigo inexistente -> 404", (await p[0].post("/me/contacts", { code: "ZZZZ22" })).status === 404);
  const contacts1 = await p[1].get("/me/contacts");
  check("el contacto aparece para los dos", contacts1.data.contacts.some((c) => c.player.id === p[0].player.id), contacts1.data);
  check("al otro le llega el aviso en vivo", Boolean(await waitFor(() => p[1].find("contact"))));
  check("los contactos no dan puntos", (await p[0].get("/me")).data.standing.points === 0);

  console.log("\n[staff y misiones definidas en codigo]");
  const staff = p[9];
  const promote = await admin.post(`/admin/users/${staff.player.id}/role`, { role: "STAFF" });
  check("admin vuelve staff a un jugador", promote.status === 200, promote);
  check("el admin no reparte rol ADMIN -> 400", (await admin.post(`/admin/users/${p[8].player.id}/role`, { role: "ADMIN" })).status === 400);
  check("a un admin no se le cambia el rol -> 409", (await admin.post(`/admin/users/${login.data.player.id}/role`, { role: "PLAYER" })).status === 409);
  check("un jugador comun no entra al panel staff -> 403", (await p[3].get(`/staff/player/${p[4].player.code}`)).status === 403);
  const afterStaff = await anon.get("/public/event");
  check("el staff no cuenta en las casas", houseMap(afterStaff.data.houses).azul === 3, afterStaff.data.houses);

  const card = await staff.get(`/staff/player/${p[2].player.code}`);
  check(
    "staff ve las misiones de src/content/missions.js",
    card.status === 200 && card.data.missions.length === MISSIONS.length && card.data.missions.every((m) => m.timesAwarded === 0),
    card,
  );
  const repeatable = MISSIONS.find((m) => m.repeatable);
  const once = MISSIONS.find((m) => !m.repeatable);
  const r1 = await staff.post("/staff/award", { code: p[2].player.code, mission: repeatable.key });
  const r2 = await staff.post("/staff/award", { code: p[2].player.code, mission: repeatable.key });
  check("mision repetible se da varias veces", r1.status === 200 && r2.status === 200 && r2.data.points === repeatable.points * 2, [r1, r2]);
  const o1 = await staff.post("/staff/award", { code: p[2].player.code, mission: once.key });
  const o2 = await staff.post("/staff/award", { code: p[2].player.code, mission: once.key });
  check("mision de una vez: la segunda -> 409", o1.status === 200 && o2.status === 409, [o1, o2]);
  const p2Points = repeatable.points * 2 + once.points;
  const card2 = await staff.get(`/staff/player/${p[2].player.code}`);
  const times = Object.fromEntries(card2.data.missions.map((m) => [m.key, m.timesAwarded]));
  check("la ficha cuenta cuantas veces recibio cada una", times[repeatable.key] === 2 && times[once.key] === 1, times);
  const big = [...MISSIONS].sort((a, b) => b.points - a.points)[0];
  const sp = await staff.post("/staff/award", { code: p[3].player.code, mission: big.key });
  check("la mision de mas puntos suma de golpe", sp.status === 200 && sp.data.points === big.points, sp);
  check("mision inexistente -> 404", (await staff.post("/staff/award", { code: p[2].player.code, mission: "no-existe" })).status === 404);
  check("no se dan misiones al staff -> 409", (await admin.post("/staff/award", { code: staff.player.code, mission: repeatable.key })).status === 409);

  console.log("\n[bingo lanzado por el admin]");
  await p[0].openStream();
  const screen = new Device("pantalla");
  await screen.openStream({ screen: true });

  const noGame = await p[0].get("/game/current");
  check("sin juego lanzado no hay cartilla", noGame.status === 200 && noGame.data.game === null, noGame);
  check("firmar sin bingo -> 409", (await p[0].post("/game/bingo/sign", { position: 0, code: code1 })).status === 409);

  const start = await admin.post("/admin/game/bingo/start");
  check(
    "iniciar bingo: cartillas solo para jugadores inscritos (9, sin staff)",
    start.status === 201 && start.data.session.status === "COUNTDOWN" && start.data.boards === 9,
    start,
  );
  const session = start.data.session;
  check("los puntajes salen de src/content/bingo.js", session.cellPoints === BINGO.cellPoints && session.completePoints === BINGO.completePoints);
  check("no se lanza otro juego encima -> 409", (await admin.post("/admin/game/bingo/start")).status === 409);

  const countdown = await waitFor(() => p[0].find("game:countdown"));
  const msLeft = countdown ? new Date(countdown.data.startsAt).getTime() - countdown.data.serverNow : null;
  check("todos reciben la cuenta regresiva de 5 s", msLeft > 4000 && msLeft <= 5500, { msLeft });
  const during = await p[0].get("/game/current");
  check("durante la cuenta regresiva aun no hay cartilla", during.data.game?.status === "COUNTDOWN" && during.data.board === null, during.data);
  check("firmar antes de que termine la cuenta -> 409", (await p[0].post("/game/bingo/sign", { position: 0, code: code1 })).status === 409);

  const started = await waitFor(() => p[0].find("game:started"), 8000);
  check("al terminar la cuenta arranca el bingo", Boolean(started) && Boolean(screen.find("game:started")));
  const current = await p[0].get("/game/current");
  check(
    "cartilla de 9 casillas con preguntas del codigo",
    current.data.game?.status === "ACTIVE" &&
      current.data.board?.cells.length === 9 &&
      current.data.board.cells.every((c) => BINGO.prompts.includes(c.text)),
    current.data,
  );

  const signers0 = [p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], staff];
  const s0 = await p[0].post("/game/bingo/sign", { position: 0, code: signers0[0].player.code });
  check("firmar una casilla con el codigo de otro", s0.status === 200 && s0.data.signedCount === 1, s0);
  check("al firmante le llega el aviso", Boolean(await waitFor(() => p[1].find("bingo:signed"))));
  check("la misma persona no firma dos casillas -> 409", (await p[0].post("/game/bingo/sign", { position: 1, code: signers0[0].player.code })).status === 409);
  check("casilla ya firmada -> 409", (await p[0].post("/game/bingo/sign", { position: 0, code: signers0[1].player.code })).status === 409);

  let last;
  for (let i = 1; i < 9; i += 1) {
    last = await p[0].post("/game/bingo/sign", { position: i, code: signers0[i].player.code });
    if (last.status !== 200) break;
  }
  check("9 firmas completan el bingo en el puesto 1", last.status === 200 && last.data.completedRank === 1, last);

  const signers1 = [p[0], p[2], p[3], p[4], p[5], p[6], p[7], p[8], staff];
  for (let i = 0; i < 9; i += 1) {
    last = await p[1].post("/game/bingo/sign", { position: i, code: signers1[i].player.code });
    if (last.status !== 200) break;
  }
  check("el segundo en completar queda en el puesto 2", last.status === 200 && last.data.completedRank === 2, last);
  for (let i = 0; i < 3; i += 1) {
    await p[5].post("/game/bingo/sign", { position: i, code: [p[6], p[7], p[8]][i].player.code });
  }

  const [b1, b2] = BINGO.podiumBonus;
  const p0Points = 9 * BINGO.cellPoints + BINGO.completePoints + b1;
  const p1Points = 9 * BINGO.cellPoints + BINGO.completePoints + b2;
  const completedEvt = await waitFor(() => screen.find("bingo:completed", (d) => d.rank === 1));
  check("la pantalla anuncia al ganador", completedEvt?.data.player.id === p[0].player.id, completedEvt);
  check(`p0: 9 firmas + completar + extra del 1er puesto = ${p0Points}`, (await p[0].get("/me")).data.standing.points === p0Points);
  check(`p1: 9 firmas + completar + extra del 2do puesto = ${p1Points}`, (await p[1].get("/me")).data.standing.points === p1Points);
  check("firmar el bingo tambien agrega contactos", (await p[0].get("/me/contacts")).data.contacts.length === 9);

  const late = await register("p10", "verde");
  const lateBoard = await late.get("/game/current");
  check("quien llega con el bingo empezado tambien recibe cartilla", lateBoard.data.board?.cells.length === 9, lateBoard.data);

  const screenState = await anon.get("/public/screen");
  check("la pantalla ve el juego y los ganadores", screenState.data.game?.status === "ACTIVE" && screenState.data.bingo?.winners.length === 2, screenState.data.bingo);
  const adminGame = await admin.get("/admin/game");
  const progress = adminGame.data.running?.progress;
  check(
    "el admin ve el avance en vivo",
    progress?.boards === 10 && progress.completed === 2 && progress.closest[0]?.player.id === p[5].player.id,
    progress,
  );

  const ended = await admin.post(`/admin/game/${session.id}/end`);
  check("el admin termina el bingo", ended.status === 200 && ended.data.results.winners[0].player.id === p[0].player.id, ended);
  check("todos reciben el fin del juego", Boolean(await waitFor(() => p[0].find("game:ended"))));
  check("firmar con el bingo terminado -> 409", (await p[5].post("/game/bingo/sign", { position: 5, code: p[4].player.code })).status === 409);
  check("sin juego en marcha /game/current vuelve a null", (await p[0].get("/game/current")).data.game === null);
  const afterEnd = await admin.get("/admin/game");
  check("el admin ve el resultado del ultimo bingo", afterEnd.data.running === null && afterEnd.data.last?.results.winners[0]?.player.id === p[0].player.id, afterEnd.data);

  console.log("\n[reconexion SSE sin perder eventos]");
  await p[5].openStream();
  const baseline = p[5].lastId();
  p[5].closeStream();
  await staff.post("/staff/award", { code: p[5].player.code, mission: repeatable.key });
  await sleep(200);
  await p[5].openStream({ lastEventId: baseline });
  const replayed = await waitFor(() => p[5].find("points", (d) => d.label === repeatable.title));
  check("al reconectar con Last-Event-ID se reenvia lo perdido", Boolean(replayed), p[5].events.map((e) => e.type));
  p[5].closeStream();
  await p[5].openStream({ lastEventId: "otroarranque-5" });
  check("id de otro arranque -> resync", Boolean(await waitFor(() => p[5].find("resync"))));
  p[5].closeStream();

  console.log("\n[ranking]");
  const lb = await anon.get("/public/leaderboard?limit=100");
  check("ranking ordenado por puntos", lb.data.top.every((r, i, arr) => i === 0 || arr[i - 1].points >= r.points));
  check("p0 lidera", lb.data.top[0]?.player.id === p[0].player.id, lb.data.top[0]);
  check("el staff no compite", !lb.data.top.some((r) => r.player.id === staff.player.id));
  const houseSum = lb.data.houses.reduce((acc, h) => acc + h.points, 0);
  const topSum = lb.data.top.reduce((acc, r) => acc + r.points, 0);
  check("la suma de las casas coincide con el ranking", houseSum === topSum, { houseSum, topSum });

  console.log("\n[admin: usuarios y cuentas]");
  check("un jugador no entra al admin -> 403", (await p[1].get("/admin/events")).status === 403);
  const search = await admin.get(`/admin/users?q=${encodeURIComponent(p[4].player.nickname)}`);
  check("buscar usuario por nombre", search.status === 200 && search.data.users.length === 1 && search.data.users[0].inEvent, search.data);
  const byCode = await admin.get(`/admin/users?q=${p[4].player.code.toLowerCase()}`);
  check("buscar usuario por codigo", byCode.data.users[0]?.id === p[4].player.id, byCode.data);

  const attempts = [];
  const brute = new Device("fuerza-bruta");
  for (let i = 0; i < 7; i += 1) {
    attempts.push((await brute.post("/auth/login", { nickname: p[7].player.nickname, pin: `99${i}0` })).status);
  }
  check("PIN incorrecto se bloquea tras 6 intentos (429)", attempts.slice(0, 6).every((s) => s === 401) && attempts[6] === 429, attempts);

  check("cambiar PIN", (await p[4].post("/me/pin", { currentPin: "1234", newPin: "5678" })).status === 200);
  const forged = new Device("cookie-falsa");
  forged.cookies.set("mq.sid", "x.y");
  check("cookie falsificada -> 401", (await forged.get("/me")).status === 401);

  const reset = await admin.post(`/admin/users/${p[8].player.id}/pin`, { pin: "4321" });
  check("el admin reinicia el PIN de quien lo olvido", reset.status === 200, reset);
  check("la sesion vieja se cierra -> 401", (await p[8].get("/me")).status === 401);
  const newPin = await new Device("p8-nuevo").post("/auth/login", { nickname: p[8].player.nickname, pin: "4321" });
  check("y entra con el PIN nuevo", newPin.status === 200, newPin);

  check("eliminar usuario", (await admin.del(`/admin/users/${p[6].player.id}`)).status === 200);
  created.players = created.players.filter((id) => id !== p[6].player.id);
  check("un admin no se elimina -> 409", (await admin.del(`/admin/users/${login.data.player.id}`)).status === 409);

  console.log("\n[cierre del evento A]");
  const p5Points = 3 * BINGO.cellPoints + repeatable.points;
  const expectedRanked = [p0Points, p1Points, big.points, p2Points, p5Points].filter((x) => x > 0).length;
  const closedA = await admin.post(`/admin/events/${A}/close`);
  check("cerrar evento congela el ranking", closedA.status === 200 && closedA.data.ranked === expectedRanked, closedA);
  const histA = await p[0].get("/me/history");
  const evA = histA.data.events.find((e) => e.id === A);
  check("el primer lugar ve su trofeo de CAMPEON en el historial", evA?.trophy?.kind === "CHAMPION" && evA.finalRank === 1, histA.data);
  const meClosed = await p[0].get("/me");
  check("sin evento abierto /me no trae evento", meClosed.data.event === null && meClosed.data.standing === null, meClosed.data);
  check("sin evento abierto los juegos responden 409", (await p[0].get("/game/current")).status === 409);
  check("un evento con historial no se borra -> 409", (await admin.del(`/admin/events/${A}`)).status === 409);

  console.log("\n[evento B: solo participan sus inscritos]");
  check("abrir evento B", (await admin.post(`/admin/events/${B}/open`)).status === 200);
  const fresh = await anon.get("/public/event");
  check("el evento nuevo empieza sin inscritos", fresh.data.event?.id === B && fresh.data.players === 0, fresh.data);

  const n0 = await register("n0", "rojo");
  const n1 = await register("n1", "verde");
  await register("n2", "verde");
  const startB = await admin.post("/admin/game/bingo/start");
  check("el bingo del evento B solo reparte cartillas a sus 3 inscritos", startB.status === 201 && startB.data.boards === 3, startB);
  await sleep(5500);

  const outsider = await n0.post("/game/bingo/sign", { position: 0, code: p[1].player.code });
  check("alguien del evento A que no entro al B no puede firmar -> 404", outsider.status === 404, outsider);
  const back = await p[1].get("/me");
  check("al abrir la app en el evento B queda inscrito", back.data.event?.id === B && back.data.standing?.points === 0, back.data);
  check("y ya puede jugar el bingo", (await p[1].get("/game/current")).data.board?.cells.length === 9);
  check("ahora si puede firmar", (await n0.post("/game/bingo/sign", { position: 0, code: p[1].player.code })).status === 200);

  await new Device("p3-login").post("/auth/login", { nickname: p[3].player.nickname, pin: "1234" });
  check("iniciar sesion durante el evento B tambien inscribe", (await n1.post("/game/bingo/sign", { position: 0, code: p[3].player.code })).status === 200);

  const other = MISSIONS.filter((m) => !m.repeatable)[1] ?? once;
  const staffB = await staff.post("/staff/award", { code: p[2].player.code, mission: other.key });
  check("el staff premia a alguien con cuenta vieja y lo inscribe", staffB.status === 200 && staffB.data.points === other.points, staffB);

  const listB = await admin.get("/admin/users?scope=event");
  const idsB = new Set(listB.data.users.map((u) => u.id));
  check("la lista del evento B tiene a los nuevos y a los que volvieron", [n0, n1, p[1], p[3], p[2]].every((d) => idsB.has(d.player.id)), [...idsB]);
  check("y no a quienes solo fueron al evento A", !idsB.has(p[0].player.id) && !idsB.has(p[4].player.id));
  const housesB = houseMap((await anon.get("/public/event")).data.houses);
  check("las casas del evento B cuentan solo a sus inscritos", housesB.rojo === 2 && housesB.verde === 3 && housesB.amarillo === 1 && housesB.azul === 0, housesB);

  const closedB = await admin.post(`/admin/events/${B}/close`);
  check("cerrar el evento termina el bingo que seguia abierto", closedB.status === 200 && (await admin.get("/admin/game")).data.running === null, closedB);

  const hist2 = await p[2].get("/me/history");
  check(
    "el historial muestra los dos eventos a los que asistio, con trofeo",
    hist2.data.events.length === 2 && hist2.data.events.every((e) => e.status === "CLOSED" && e.trophy),
    hist2.data.events,
  );
  const contactsOld = await p[0].get("/me/contacts");
  check(
    "los contactos se conservan entre eventos (menos el usuario eliminado)",
    contactsOld.data.contacts.length === 8 && contactsOld.data.contacts.every((c) => c.eventName === `Smoke A ${RUN}`),
    contactsOld.data.contacts,
  );

  [p[0], p[1], screen].forEach((d) => d.closeStream());
}

/** Borra todo lo que creo la prueba, pase lo que pase. */
async function cleanup() {
  const admin = new Device("admin-limpieza");
  const login = await admin.post("/auth/login", ADMIN).catch(() => null);
  if (login?.status !== 200) return;
  for (const id of created.events) {
    await admin.post(`/admin/events/${id}/close`).catch(() => {});
  }
  for (const id of created.players) {
    await admin.del(`/admin/users/${id}`).catch(() => {});
  }
  let deleted = 0;
  for (const id of created.events) {
    const r = await admin.del(`/admin/events/${id}`).catch(() => ({ status: 0 }));
    if (r.status === 200) deleted += 1;
  }
  console.log(`\nLimpieza: ${created.players.length} jugadores y ${deleted} eventos de prueba borrados.`);
}

main()
  .catch((error) => {
    console.error("\nLa prueba se detuvo:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup().catch((error) => console.error("No se pudo limpiar:", error.message));
    console.log(`\n${passed} verificaciones OK, ${failures.length} fallidas`);
    if (failures.length) {
      console.log("Fallaron:\n - " + failures.join("\n - "));
      process.exitCode = 1;
    }
    setTimeout(() => process.exit(), 200);
  });
