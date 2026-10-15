/**
 * Prueba de punta a punta de la API contra un servidor corriendo.
 *
 *   npm test        (usa API_URL y ADMIN_CLAVE del .env)
 *
 * Crea sus propios eventos y jugadores, juega rondas completas y al final
 * borra todo lo que creo. NO la corras contra produccion: se niega si hay un
 * evento real abierto.
 */
require("dotenv").config({ quiet: true });

const BINGO = require("../src/content/bingo");

const API = (process.env.API_URL || "http://localhost:3001").replace(/\/$/, "");
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_CLAVE = process.env.ADMIN_CLAVE || process.env.ADMIN_CODE;
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
    if (csrf) headers["x-bg"] = "1";
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

async function register(label) {
  const device = new Device(label);
  const r = await device.post("/auth/entrar", { usuario: `smk${RUN}${label}`, clave: "1234" });
  if (r.status !== 201) throw new Error(`registro ${label}: ${r.status} ${JSON.stringify(r.data)}`);
  device.player = r.data.player;
  created.players.push(device.player.id);
  return device;
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("No corras la prueba en produccion");
  if (!ADMIN_CLAVE) throw new Error("Define ADMIN_CLAVE en el .env");

  console.log(`\nPrueba de humo contra ${API} (corrida ${RUN})\n`);

  console.log("[basico]");
  const anon = new Device("anon");
  check("health responde", (await anon.get("/health")).status === 200);
  check("/me sin sesion -> 401", (await anon.get("/me")).status === 401);
  const noCsrf = await anon.req("POST", "/auth/entrar", { usuario: "x", clave: "1234" }, { csrf: false });
  check("escritura sin cabecera anti-CSRF -> 403", noCsrf.status === 403, noCsrf);

  console.log("\n[admin: una cuenta con rol, no un codigo suelto]");
  const admin = new Device("admin");
  check("sin sesion el panel responde 401", (await admin.get("/admin/overview")).status === 401);
  check(
    "clave incorrecta -> 401",
    (await admin.post("/auth/entrar", { usuario: ADMIN_USER, clave: `no-${ADMIN_CLAVE}` })).status === 401,
  );
  const adminLogin = await admin.post("/auth/entrar", { usuario: ADMIN_USER, clave: ADMIN_CLAVE });
  check("con su clave entra", adminLogin.status === 200, adminLogin);
  check("y la app sabe que es admin", adminLogin.data?.player?.role === "ADMIN");
  check("el admin no juega: /game -> 403", (await admin.get("/game/current")).status === 403);
  check("el admin no tiene tarjeta: /me/misiones -> 403", (await admin.get("/me/misiones")).status === 403);
  check("un anonimo no ve el panel", (await anon.get("/admin/overview")).status === 401);

  console.log("\n[eventos]");
  const eventsBefore = await admin.get("/admin/events");
  const live = eventsBefore.data.events.find((e) => e.status === "LIVE");
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

  console.log("\n[registro y sesion]");
  check("el evento abierto empieza sin jugadores", (await anon.get("/public/event")).data.players === 0);

  const p = [];
  for (let i = 0; i < 10; i += 1) p.push(await register(`p${i}`));
  check("10 jugadores con codigo de 6", p.every((d) => d.player.code.length === 6));
  check("la portada cuenta a los 10", (await anon.get("/public/event")).data.players === 10);

  const dup = await new Device("dup").post("/auth/entrar", { usuario: `SMK${RUN}P0`, clave: "9999" });
  check("el mismo usuario con otra clave -> 401", dup.status === 401, dup);
  const mismo = await new Device("mismo").post("/auth/entrar", { usuario: `SMK${RUN}P0`, clave: "1234" });
  check(
    "y con su clave entra a la misma cuenta",
    mismo.data?.player?.id === p[0].player.id && mismo.data?.nuevo === false,
  );
  check("usuario de una letra -> 400", (await new Device("x").post("/auth/entrar", { usuario: "a", clave: "1234" })).status === 400);
  check(
    "clave de 2 digitos en cuenta nueva -> 400",
    (await new Device("x").post("/auth/entrar", { usuario: `smk${RUN}zz`, clave: "12" })).status === 400,
  );
  check("un jugador no entra al panel -> 403", (await p[0].get("/admin/overview")).status === 403);
  check("nace sin personaje", p[0].player.skin === null);
  check("elige personaje", (await p[0].post("/me/skin", { skin: "toro" })).data?.player?.skin === "toro");
  check("un personaje inventado -> 400", (await p[0].post("/me/skin", { skin: "dragon" })).status === 400);
  check("recibe su ticket del lobby", typeof (await p[0].post("/me/lobby-ticket")).data?.ticket === "string");

  const me0 = await p[0].get("/me");
  check("/me trae el evento abierto y su codigo", me0.data.event?.id === A && me0.data.player.code === p[0].player.code, me0.data);
  const phone2 = new Device("p0-otro-celular");
  const relog = await phone2.post("/auth/entrar", { usuario: p[0].player.name, clave: "1234" });
  check("entrar desde otro celular recupera la misma cuenta", relog.data?.player?.id === p[0].player.id, relog);

  console.log("\n[ronda 1]");
  await p[0].openStream();
  const screen = new Device("pantalla");
  await screen.openStream({ screen: true });

  check("sin ronda no hay cartilla", (await p[0].get("/game/current")).data.round === null);
  check("firmar sin ronda -> 409", (await p[0].post("/game/sign", { position: 0, code: p[1].player.code })).status === 409);

  const start = await admin.post("/admin/rounds");
  check(
    "nueva ronda: cartilla para los 10 inscritos",
    start.status === 201 && start.data.round.number === 1 && start.data.cards === 10,
    start,
  );
  check("los puntajes salen de src/content/bingo.js", start.data.round.cellPoints === BINGO.cellPoints);

  const countdown = await waitFor(() => p[0].find("round:countdown"));
  const msLeft = countdown ? new Date(countdown.data.startsAt).getTime() - countdown.data.serverNow : null;
  check("todos reciben la cuenta regresiva de 5 s", msLeft > 4000 && msLeft <= 5500, { msLeft });
  const during = await p[0].get("/game/current");
  check("durante la cuenta aun no hay cartilla", during.data.round?.status === "COUNTDOWN" && during.data.card === null);
  check("firmar antes de tiempo -> 409", (await p[0].post("/game/sign", { position: 0, code: p[1].player.code })).status === 409);

  check("al terminar la cuenta arranca la ronda", Boolean(await waitFor(() => p[0].find("round:started"), 8000)));
  const current = await p[0].get("/game/current");
  check(
    "cartilla de 9 casillas con preguntas del codigo",
    current.data.card?.cells.length === 9 && current.data.card.cells.every((c) => BINGO.prompts.includes(c.text)),
    current.data.card,
  );

  const s0 = await p[0].post("/game/sign", { position: 0, code: p[1].player.code });
  check("firmar una casilla con el codigo de otro", s0.status === 200 && s0.data.signedCount === 1, s0);
  check("la misma persona no firma dos casillas -> 409", (await p[0].post("/game/sign", { position: 1, code: p[1].player.code })).status === 409);
  check("casilla ya firmada -> 409", (await p[0].post("/game/sign", { position: 0, code: p[2].player.code })).status === 409);
  check("tu propio codigo -> 400", (await p[0].post("/game/sign", { position: 1, code: p[0].player.code })).status === 400);
  check("codigo inexistente -> 404", (await p[0].post("/game/sign", { position: 1, code: "ZZZZ22" })).status === 404);

  let last;
  for (let i = 1; i < 9; i += 1) {
    last = await p[0].post("/game/sign", { position: i, code: p[i + 1].player.code });
    if (last.status !== 200) break;
  }
  check("9 firmas completan el bingo en el puesto 1", last.status === 200 && last.data.completedRank === 1, last);

  const signers1 = [p[0], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9]];
  for (let i = 0; i < 9; i += 1) {
    last = await p[1].post("/game/sign", { position: i, code: signers1[i].player.code });
    if (last.status !== 200) break;
  }
  check("el segundo en completar queda en el puesto 2", last.status === 200 && last.data.completedRank === 2, last);
  for (let i = 0; i < 3; i += 1) {
    await p[2].post("/game/sign", { position: i, code: [p[6], p[7], p[8]][i].player.code });
  }

  const [b1, b2] = BINGO.podiumBonus;
  const p0Points = 9 * BINGO.cellPoints + BINGO.completePoints + b1;
  const p1Points = 9 * BINGO.cellPoints + BINGO.completePoints + b2;
  check("la pantalla anuncia al ganador", Boolean(await waitFor(() => screen.find("bingo:completed", (d) => d.rank === 1))));
  check(`p0 suma ${p0Points} (9 firmas + bingo + extra del 1er puesto)`, (await p[0].get("/me")).data.standing.points === p0Points);
  check(`p1 suma ${p1Points}`, (await p[1].get("/me")).data.standing.points === p1Points);

  const late = await register("p10");
  check("quien llega con la ronda empezada tambien recibe cartilla", (await late.get("/game/current")).data.card?.cells.length === 9);

  const overview = await admin.get("/admin/overview");
  check(
    "el panel ve el avance en vivo",
    overview.data.round?.progress.cards === 11 &&
      overview.data.round.progress.completed === 2 &&
      overview.data.round.progress.closest[0]?.player.id === p[2].player.id,
    overview.data.round?.progress,
  );
  check("y el ranking", overview.data.top[0]?.player.id === p[0].player.id && overview.data.players === 11);

  const ended = await admin.post(`/admin/rounds/${start.data.round.id}/end`);
  check("terminar la ronda", ended.status === 200 && ended.data.results.winners[0].player.id === p[0].player.id, ended);
  check("todos reciben el fin de la ronda", Boolean(await waitFor(() => p[0].find("round:ended"))));
  check("firmar con la ronda terminada -> 409", (await p[2].post("/game/sign", { position: 5, code: p[3].player.code })).status === 409);
  const afterEnd = await admin.get("/admin/overview");
  check("el panel muestra el resultado de la ultima ronda", afterEnd.data.round === null && afterEnd.data.lastRound?.results.winners.length === 2);

  console.log("\n[ronda 2: todos reciben cartilla nueva]");
  const round2 = await admin.post("/admin/rounds");
  check("nueva ronda para los 11", round2.status === 201 && round2.data.round.number === 2 && round2.data.cards === 11, round2);
  await sleep(5500);
  const card2 = await p[0].get("/game/current");
  check("la cartilla nueva viene en blanco", card2.data.card?.signed === 0 && card2.data.card.completedRank === null);
  check("los puntos de la ronda anterior se mantienen", (await p[0].get("/me")).data.standing.points === p0Points);

  const round3 = await admin.post("/admin/rounds");
  check("crear otra ronda cierra la anterior sola", round3.status === 201 && round3.data.round.number === 3, round3);
  await sleep(5500);

  console.log("\n[panel: jugadores]");
  const byName = await admin.get(`/admin/players?q=${encodeURIComponent(p[4].player.name)}`);
  check("buscar por nombre", byName.data.players.length === 1 && byName.data.players[0].inEvent, byName.data);
  const byCode = await admin.get(`/admin/players?q=${p[4].player.code.toLowerCase()}`);
  check("buscar por codigo", byCode.data.players[0]?.id === p[4].player.id);

  const before = (await p[2].get("/me")).data.standing.points;
  const adjust = await admin.post(`/admin/players/${p[2].player.id}/points`, { amount: 25, reason: "Gano el reto del escenario" });
  check("ajustar puntos a mano", adjust.status === 200 && (await p[2].get("/me")).data.standing.points === before + 25, adjust);
  check("ajuste de 0 -> 400", (await admin.post(`/admin/players/${p[2].player.id}/points`, { amount: 0, reason: "nada" })).status === 400);
  const penalty = await admin.post(`/admin/players/${p[2].player.id}/points`, { amount: -5000, reason: "Penalizacion" });
  check("los puntos nunca bajan de 0", penalty.status === 200 && (await p[2].get("/me")).data.standing.points === 0);

  const reset = await admin.post(`/admin/players/${p[9].player.id}/clave`, { clave: "4321" });
  check("reiniciar la clave de quien la olvido", reset.status === 200, reset);
  check("su sesion vieja se cierra -> 401", (await p[9].get("/me")).status === 401);
  check(
    "y entra con la clave nueva",
    (await new Device("p9").post("/auth/entrar", { usuario: p[9].player.name, clave: "4321" })).status === 200,
  );

  check("borrar un jugador", (await admin.del(`/admin/players/${p[8].player.id}`)).status === 200);
  created.players = created.players.filter((id) => id !== p[8].player.id);

  console.log("\n[seguridad de cuentas]");
  const attempts = [];
  const brute = new Device("fuerza-bruta");
  for (let i = 0; i < 7; i += 1) {
    attempts.push((await brute.post("/auth/entrar", { usuario: p[7].player.name, clave: `99${i}0` })).status);
  }
  check("clave incorrecta se bloquea tras 6 intentos (429)", attempts.slice(0, 6).every((s) => s === 401) && attempts[6] === 429, attempts);
  check("cambiar mi clave", (await p[5].post("/me/clave", { actual: "1234", nueva: "5678" })).status === 200);
  const forged = new Device("cookie-falsa");
  forged.cookies.set("bg.sid", "x.y");
  check("cookie falsificada -> 401", (await forged.get("/me")).status === 401);

  console.log("\n[ranking y pantalla]");
  const lb = await anon.get("/public/leaderboard?limit=100");
  check("ranking ordenado por puntos", lb.data.top.every((r, i, arr) => i === 0 || arr[i - 1].points >= r.points));
  check("p0 lidera", lb.data.top[0]?.player.id === p[0].player.id, lb.data.top[0]);
  const screenState = await anon.get("/public/screen");
  check("la pantalla gigante trae evento, ronda y top", screenState.data.event?.id === A && screenState.data.round !== null && screenState.data.top.length > 0);

  console.log("\n[reconexion SSE sin perder eventos]");
  await p[3].openStream();
  const baseline = p[3].lastId();
  p[3].closeStream();
  await admin.post(`/admin/players/${p[3].player.id}/points`, { amount: 7, reason: "Prueba de reconexion" });
  await sleep(200);
  await p[3].openStream({ lastEventId: baseline });
  check(
    "al reconectar con Last-Event-ID se reenvia lo perdido",
    Boolean(await waitFor(() => p[3].find("points", (d) => d.label === "Prueba de reconexion"))),
    p[3].events.map((e) => e.type),
  );
  p[3].closeStream();
  await p[3].openStream({ lastEventId: "otroarranque-5" });
  check("id de otro arranque -> resync", Boolean(await waitFor(() => p[3].find("resync"))));
  p[3].closeStream();

  console.log("\n[cierre del evento A]");
  const closedA = await admin.post(`/admin/events/${A}/close`);
  check("cerrar el evento congela el ranking", closedA.status === 200 && closedA.data.ranked >= 2, closedA);
  const hist = await p[0].get("/me/history");
  const evA = hist.data.events.find((e) => e.id === A);
  check("el jugador ve el evento y su puesto final", evA?.finalRank === 1 && evA.points === p0Points, hist.data.events);
  check("sin evento abierto /me no trae evento", (await p[0].get("/me")).data.event === null);
  check("sin evento abierto el juego responde 409", (await p[0].get("/game/current")).status === 409);
  check("un evento con historial no se borra -> 409", (await admin.del(`/admin/events/${A}`)).status === 409);

  console.log("\n[evento B: el bingo sirve para cualquier evento]");
  check("abrir evento B", (await admin.post(`/admin/events/${B}/open`)).status === 200);
  check("el evento nuevo empieza sin jugadores", (await anon.get("/public/event")).data.players === 0);

  const n0 = await register("n0");
  await register("n1");
  const startB = await admin.post("/admin/rounds");
  check("la ronda del evento B solo reparte a sus 2 inscritos", startB.status === 201 && startB.data.cards === 2 && startB.data.round.number === 1, startB);
  await sleep(5500);

  check(
    "alguien del evento A que no entro al B no puede firmar -> 404",
    (await n0.post("/game/sign", { position: 0, code: p[1].player.code })).status === 404,
  );
  const back = await p[1].get("/me");
  check("al abrir la app en el evento B queda inscrito", back.data.event?.id === B && back.data.standing?.points === 0, back.data);
  check("y ahora si puede firmar", (await n0.post("/game/sign", { position: 0, code: p[1].player.code })).status === 200);
  check("cerrar el evento termina la ronda abierta", (await admin.post(`/admin/events/${B}/close`)).status === 200);

  const hist2 = await p[1].get("/me/history");
  check("el historial muestra los dos eventos", hist2.data.events.length === 2 && hist2.data.events.every((e) => e.status === "CLOSED"), hist2.data.events);

  [p[0], screen].forEach((d) => d.closeStream());
}

/** Borra todo lo que creo la prueba, pase lo que pase. */
async function cleanup() {
  const admin = new Device("admin-limpieza");
  const login = await admin.post("/auth/entrar", { usuario: ADMIN_USER, clave: ADMIN_CLAVE }).catch(() => null);
  if (login?.status !== 200) return;
  for (const id of created.events) await admin.post(`/admin/events/${id}/close`).catch(() => {});
  for (const id of created.players) await admin.del(`/admin/players/${id}`).catch(() => {});
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
