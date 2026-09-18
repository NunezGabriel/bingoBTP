/**
 * Prueba de carga: simula un evento con muchos celulares a la vez.
 *
 *   npm run loadtest -- 300 90      (300 jugadores durante 90 segundos)
 *
 * Crea su propio evento "Carga ...". Cada jugador simulado se registra, deja
 * abierto su stream en vivo (como la app real) y juega a ritmo humano: agrega
 * contactos, firma el bingo y consulta su personaje. El admin lanza el bingo
 * al inicio (todos reciben la cuenta regresiva a la vez) y a mitad de la prueba
 * el staff reparte misiones en rafaga. Al final borra todo lo que creo.
 *
 * NO la corras contra produccion.
 */
require("dotenv").config({ quiet: true });
const http = require("node:http");
const MISSIONS = require("../src/content/missions");

const API = new URL(process.env.API_URL || "http://localhost:3001");
const PLAYERS = Number(process.argv[2] || 300);
const DURATION_S = Number(process.argv[3] || 90);
const RUN = Date.now().toString(36).slice(-4);

const agent = new http.Agent({ keepAlive: true, maxSockets: 2000 });
const stats = new Map();
let errors = 0;
const errorSamples = new Map();

function record(name, ms, ok, status) {
  if (!stats.has(name)) stats.set(name, []);
  stats.get(name).push(ms);
  if (!ok) {
    errors += 1;
    const key = `${name} ${status}`;
    errorSamples.set(key, (errorSamples.get(key) ?? 0) + 1);
  }
}

function request(method, path, body, cookie, name) {
  return new Promise((resolve) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const started = performance.now();
    const req = http.request(
      {
        host: API.hostname,
        port: API.port,
        path: `/api${path}`,
        method,
        agent,
        headers: {
          "Content-Type": "application/json",
          "x-mq": "1",
          ...(cookie ? { Cookie: cookie } : {}),
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          const ms = performance.now() - started;
          // 4xx de reglas del juego (casilla ya firmada, contacto repetido) son respuestas validas
          const ok = res.statusCode < 500 && res.statusCode !== 429;
          record(name ?? `${method} ${path.split("?")[0]}`, ms, ok, res.statusCode);
          let json = null;
          try {
            json = data ? JSON.parse(data) : null;
          } catch {
            json = null;
          }
          resolve({ status: res.statusCode, data: json, headers: res.headers });
        });
      },
    );
    req.on("error", () => {
      record(name ?? path, performance.now() - started, false, "ERR");
      resolve({ status: 0, data: null, headers: {} });
    });
    req.setTimeout(30_000, () => req.destroy());
    if (payload) req.write(payload);
    req.end();
  });
}

function openStream(cookie, counters) {
  const req = http.request({
    host: API.hostname,
    port: API.port,
    path: "/api/stream",
    headers: { Accept: "text/event-stream", Cookie: cookie },
    agent: false,
  });
  req.on("response", (res) => {
    counters.opened += 1;
    res.setEncoding("utf8");
    res.on("data", (chunk) => {
      counters.events += (chunk.match(/^event: /gm) ?? []).length;
      if (chunk.includes("event: game:countdown")) counters.countdown += 1;
      if (chunk.includes("event: game:started")) counters.started += 1;
    });
  });
  req.on("error", () => (counters.streamErrors += 1));
  req.end();
  return req;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

function pct(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

async function inBatches(items, size, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return out;
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("No corras la prueba de carga en produccion");
  console.log(`\nPrueba de carga: ${PLAYERS} jugadores, ${DURATION_S}s contra ${API.origin}\n`);

  const adminLogin = await request("POST", "/auth/login", {
    nickname: process.env.ADMIN_NICKNAME,
    pin: process.env.ADMIN_PIN,
  });
  const adminCookie = adminLogin.headers["set-cookie"]?.[0]?.split(";")[0];
  if (!adminCookie) throw new Error("No se pudo entrar como admin");

  const { data: evs } = await request("GET", "/admin/events", null, adminCookie);
  if (evs.live) throw new Error(`"${evs.live.name}" esta abierto. Cierralo antes de la prueba de carga.`);
  const { data: created } = await request("POST", "/admin/events", { name: `Carga ${RUN}` }, adminCookie);
  const eventId = created.event.id;
  await request("POST", `/admin/events/${eventId}/open`, null, adminCookie);
  const mission = MISSIONS.find((m) => m.repeatable) ?? MISSIONS[0];

  const cleanup = async (players) => {
    await request("POST", `/admin/events/${eventId}/close`, null, adminCookie);
    await inBatches(players, 20, (p) => request("DELETE", `/admin/users/${p.id}`, null, adminCookie, "limpieza"));
    await request("DELETE", `/admin/events/${eventId}`, null, adminCookie, "limpieza");
  };

  // 1. Registro masivo (la fila de la entrada)
  const t0 = performance.now();
  const classes = ["esqueleto", "mago", "caballero", "robot", "ninja", "fantasma", "slime", "astronauta"];
  const houses = ["azul", "rojo", "amarillo", "verde"];
  const players = (
    await inBatches([...Array(PLAYERS).keys()], 50, async (i) => {
      const r = await request(
        "POST",
        "/auth/register",
        { nickname: `lt${RUN}_${i}`, pin: "1234", avatarClass: rand(classes), avatarHouse: rand(houses) },
        null,
        "registro",
      );
      const cookie = r.headers["set-cookie"]?.[0]?.split(";")[0];
      return cookie ? { cookie, id: r.data.player.id, code: r.data.player.code } : null;
    })
  ).filter(Boolean);
  const registerSeconds = (performance.now() - t0) / 1000;
  console.log(`Registro: ${players.length}/${PLAYERS} en ${registerSeconds.toFixed(1)}s`);

  try {
    // 2. Todos abren su conexion en vivo y cargan la app
    const counters = { opened: 0, events: 0, countdown: 0, started: 0, streamErrors: 0 };
    const streams = players.map((p) => openStream(p.cookie, counters));
    await sleep(3000);
    console.log(`Streams en vivo abiertos: ${counters.opened}/${players.length}`);
    await inBatches(players, 100, (p) => request("GET", "/me", null, p.cookie, "GET /me"));

    // 3. El admin lanza el bingo: cartillas para todos + cuenta regresiva
    const launch = await request("POST", "/admin/game/bingo/start", {}, adminCookie, "lanzar bingo");
    const sessionId = launch.data?.session?.id;
    console.log(`Bingo lanzado: ${launch.data?.boards ?? 0} cartillas`);
    await sleep(5500);
    await inBatches(players, 100, (p) => request("GET", "/game/current", null, p.cookie, "cargar cartilla"));

    // 4. Juego sostenido a ritmo humano: cada jugador actua cada 2-6 s
    const end = Date.now() + DURATION_S * 1000;
    let actions = 0;
    const actor = async (p) => {
      while (Date.now() < end) {
        await sleep(2000 + Math.random() * 4000);
        if (Date.now() >= end) break;
        const roll = Math.random();
        if (roll < 0.25) {
          await request("POST", "/me/contacts", { code: rand(players).code }, p.cookie, "contacto");
        } else if (roll < 0.65) {
          await request(
            "POST",
            "/game/bingo/sign",
            { position: Math.floor(Math.random() * 9), code: rand(players).code },
            p.cookie,
            "bingo firma",
          );
        } else if (roll < 0.85) {
          await request("GET", "/me", null, p.cookie, "GET /me");
        } else {
          await request("GET", "/public/leaderboard", null, p.cookie, "ranking");
        }
        actions += 1;
      }
    };

    // A mitad de la prueba: 3 personas de staff dando misiones sin parar
    let awards = 0;
    const staffBurst = (async () => {
      await sleep((DURATION_S * 1000) / 2);
      const until = Date.now() + 15_000;
      await Promise.all(
        [0, 1, 2].map(async () => {
          while (Date.now() < until) {
            const r = await request(
              "POST",
              "/staff/award",
              { code: rand(players).code, mission: mission.key },
              adminCookie,
              "mision staff",
            );
            if (r.status === 200) awards += 1;
          }
        }),
      );
    })();

    const progress = setInterval(() => {
      const left = Math.max(0, Math.round((end - Date.now()) / 1000));
      console.log(`  ... ${left}s restantes, ${actions} acciones, ${errors} errores, ${counters.events} eventos en vivo`);
    }, 15_000);

    await Promise.all([...players.map(actor), staffBurst]);
    clearInterval(progress);

    const t = performance.now();
    const ended = sessionId ? await request("POST", `/admin/game/${sessionId}/end`, null, adminCookie, "terminar bingo") : null;
    const endMs = performance.now() - t;
    const { data: overview } = await request("GET", "/admin/events", null, adminCookie);
    streams.forEach((s) => s.destroy());

    // 5. Reporte
    const totalRequests = [...stats.values()].reduce((a, v) => a + v.length, 0);
    console.log(`\n${"accion".padEnd(18)} ${"n".padStart(6)} ${"p50".padStart(7)} ${"p95".padStart(7)} ${"p99".padStart(7)} ${"max".padStart(7)}`);
    for (const [name, values] of stats) {
      console.log(
        `${name.padEnd(18)} ${String(values.length).padStart(6)} ${pct(values, 50).toFixed(0).padStart(5)}ms ${pct(values, 95).toFixed(0).padStart(5)}ms ${pct(values, 99).toFixed(0).padStart(5)}ms ${Math.max(...values).toFixed(0).padStart(5)}ms`,
      );
    }
    const rps = totalRequests / (DURATION_S + registerSeconds);
    console.log(`\nPeticiones: ${totalRequests} (${rps.toFixed(1)}/s promedio) · errores de servidor: ${errors}`);
    if (errorSamples.size) console.log("Errores:", Object.fromEntries(errorSamples));
    console.log(`Streams en vivo: ${counters.opened} abiertos, ${counters.streamErrors} errores, ${counters.events} eventos entregados`);
    console.log(`Cuenta regresiva: llego a ${counters.countdown}/${players.length} · inicio del bingo: ${counters.started}/${players.length}`);
    console.log(`Misiones del staff en rafaga: ${awards}`);
    if (ended?.data?.results) {
      console.log(`Terminar bingo: ${endMs.toFixed(0)}ms · ${ended.data.results.completed} cartillas completas`);
    }
    if (overview?.live) console.log(`Servidor: ${overview.live.connected} conexiones en vivo al final`);
  } finally {
    await cleanup(players);
    console.log(`\nLimpieza: evento "Carga ${RUN}" y ${players.length} jugadores borrados.`);
    agent.destroy();
  }
}

main()
  .catch((error) => {
    console.error("\nLa prueba se detuvo:", error.stack);
    process.exitCode = 1;
  })
  .finally(() => setTimeout(() => process.exit(), 500));
