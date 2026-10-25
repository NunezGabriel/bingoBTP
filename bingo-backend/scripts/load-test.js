/**
 * Prueba de carga: simula un evento con muchos celulares a la vez.
 *
 *   npm run loadtest -- 300 90      (300 jugadores durante 90 segundos)
 *
 * Crea su propio evento "Carga ...". Cada jugador simulado se registra, deja
 * abierto su stream en vivo (como la app real) y juega a ritmo humano. El admin
 * empieza una ronda al inicio (todos reciben la cuenta regresiva a la vez) y a
 * mitad de la prueba crea otra ronda: el momento mas pesado, porque reparte
 * cartilla nueva a todos. Al final borra todo lo que creo.
 *
 * NO la corras contra produccion.
 */
require("dotenv").config({ quiet: true });
const http = require("node:http");
const https = require("node:https");

const API = new URL(process.env.API_URL || "http://localhost:3001");
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_CLAVE = process.env.ADMIN_CLAVE || process.env.ADMIN_CODE;
const PLAYERS = Number(process.argv[2] || 300);
const DURATION_S = Number(process.argv[3] || 90);
const RUN = Date.now().toString(36).slice(-4);

// La prueba nacio para correr contra local, por HTTP. Contra el destino real
// la direccion es https, asi que el modulo y el puerto salen de la URL: sin
// esto, medir produccion era imposible, que es justo para lo que sirve.
const red = API.protocol === "https:" ? https : http;
const PORT = API.port || (API.protocol === "https:" ? 443 : 80);
const agent = new red.Agent({ keepAlive: true, maxSockets: 2000 });
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
    const req = red.request(
      {
        host: API.hostname,
        port: PORT,
        path: `/api${path}`,
        method,
        agent,
        headers: {
          "Content-Type": "application/json",
          "x-bg": "1",
          ...(cookie ? { Cookie: cookie } : {}),
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          const ms = performance.now() - started;
          // 4xx de reglas del juego (casilla ya firmada, etc.) son respuestas validas
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
  const req = red.request({
    host: API.hostname,
    port: PORT,
    path: "/api/stream",
    headers: { Accept: "text/event-stream", Cookie: cookie },
    agent: false,
  });
  req.on("response", (res) => {
    counters.opened += 1;
    res.setEncoding("utf8");
    res.on("data", (chunk) => {
      counters.events += (chunk.match(/^event: /gm) ?? []).length;
      if (chunk.includes("event: round:countdown")) counters.countdown += 1;
      if (chunk.includes("event: round:started")) counters.started += 1;
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
  if (!ADMIN_CLAVE) throw new Error("Define ADMIN_CLAVE en el .env");
  console.log(`\nPrueba de carga: ${PLAYERS} jugadores, ${DURATION_S}s contra ${API.origin}\n`);

  const adminLogin = await request("POST", "/auth/entrar", { usuario: ADMIN_USER, clave: ADMIN_CLAVE });
  const adminCookie = adminLogin.headers["set-cookie"]?.[0]?.split(";")[0];
  if (!adminCookie) throw new Error("No se pudo entrar con la cuenta de admin (ADMIN_USER / ADMIN_CLAVE)");

  const { data: evs } = await request("GET", "/admin/events", null, adminCookie);
  const live = evs.events.find((e) => e.status === "LIVE");
  if (live) throw new Error(`"${live.name}" esta abierto. Cierralo antes de la prueba de carga.`);
  const { data: created } = await request("POST", "/admin/events", { name: `Carga ${RUN}` }, adminCookie);
  const eventId = created.event.id;
  await request("POST", `/admin/events/${eventId}/open`, null, adminCookie);

  const cleanup = async (players) => {
    await request("POST", `/admin/events/${eventId}/close`, null, adminCookie);
    await inBatches(players, 20, (p) => request("DELETE", `/admin/players/${p.id}`, null, adminCookie, "limpieza"));
    await request("DELETE", `/admin/events/${eventId}`, null, adminCookie, "limpieza");
  };

  // 1. Registro masivo (la fila de la entrada)
  const t0 = performance.now();
  const players = (
    await inBatches([...Array(PLAYERS).keys()], 50, async (i) => {
      const r = await request("POST", "/auth/entrar", { usuario: `lt${RUN}_${i}`, clave: "1234" }, null, "registro");
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

    // 3. El admin empieza la ronda: cartilla para todos + cuenta regresiva
    const t1 = performance.now();
    const round1 = await request("POST", "/admin/rounds", null, adminCookie, "nueva ronda");
    console.log(`Ronda 1: ${round1.data?.cards ?? 0} cartillas en ${(performance.now() - t1).toFixed(0)}ms`);
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
        if (roll < 0.6) {
          await request(
            "POST",
            "/game/sign",
            { position: Math.floor(Math.random() * 9), code: rand(players).code },
            p.cookie,
            "firmar casilla",
          );
        } else if (roll < 0.85) {
          await request("GET", "/me", null, p.cookie, "GET /me");
        } else {
          await request("GET", "/public/leaderboard", null, p.cookie, "ranking");
        }
        actions += 1;
      }
    };

    // A mitad: el admin reinicia la ronda (reparte cartilla nueva a todos).
    let round2Ms = 0;
    let round2Cards = 0;
    const restart = (async () => {
      await sleep((DURATION_S * 1000) / 2);
      const t = performance.now();
      const r = await request("POST", "/admin/rounds", null, adminCookie, "nueva ronda");
      round2Ms = performance.now() - t;
      round2Cards = r.data?.cards ?? 0;
      await sleep(5500);
      await inBatches(players, 100, (p) => request("GET", "/game/current", null, p.cookie, "cargar cartilla"));
    })();

    const progress = setInterval(() => {
      const left = Math.max(0, Math.round((end - Date.now()) / 1000));
      console.log(`  ... ${left}s restantes, ${actions} acciones, ${errors} errores, ${counters.events} eventos en vivo`);
    }, 15_000);

    await Promise.all([...players.map(actor), restart]);
    clearInterval(progress);

    const { data: overview } = await request("GET", "/admin/overview", null, adminCookie);
    if (overview?.round) {
      await request("POST", `/admin/rounds/${overview.round.id}/end`, null, adminCookie, "terminar ronda");
    }
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
    console.log(`Cuenta regresiva: llego a ${counters.countdown} celulares · inicio de ronda: ${counters.started}`);
    console.log(`Reiniciar ronda con todos jugando: ${round2Ms.toFixed(0)}ms para ${round2Cards} cartillas`);
    if (overview) console.log(`Servidor: ${overview.connected} conexiones en vivo al final`);
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
