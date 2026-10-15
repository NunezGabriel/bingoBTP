/**
 * Llena el evento abierto con jugadores de demostracion que juegan de verdad
 * a traves de la API. Sirve para ensayar la pantalla gigante y el panel admin.
 *
 *   npm run demo -- 24
 *
 * Si no hay evento abierto, abre el primero sin abrir. Solo para desarrollo.
 */
require("dotenv").config({ quiet: true });

const API = (process.env.API_URL || "http://localhost:3001").replace(/\/$/, "");
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_CLAVE = process.env.ADMIN_CLAVE || process.env.ADMIN_CODE;
const COUNT = Number(process.argv[2] || 24);
const NAMES = [
  "Pixelita", "ByteMan", "LaVicuna", "DevCondor", "Kotlina", "NullPointer", "SrDeploy", "GlitchQueen",
  "Rocoto404", "AreQdev", "CuyCoder", "Chupito", "LlamaDrama", "FlutterFly", "StackTrace", "QuesoHelado",
  "AdoboJS", "RawrDev", "ColcaBit", "Yanahuara", "Solcito", "Sillar", "PumaByte", "Chachani",
];

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Device {
  constructor() {
    this.cookie = "";
  }
  async req(method, path, body) {
    const res = await fetch(`${API}/api${path}`, {
      method,
      headers: { "Content-Type": "application/json", "x-bg": "1", ...(this.cookie ? { Cookie: this.cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.getSetCookie?.() ?? [];
    if (set.length) this.cookie = set[0].split(";")[0];
    const text = await res.text();
    return { status: res.status, data: text ? JSON.parse(text) : null };
  }
}

async function main() {
  if (!ADMIN_CLAVE) throw new Error("Define ADMIN_CLAVE en el .env");
  const admin = new Device();
  const login = await admin.req("POST", "/auth/entrar", { usuario: ADMIN_USER, clave: ADMIN_CLAVE });
  if (login.status !== 200) throw new Error("No se pudo entrar con la cuenta de admin (ADMIN_USER / ADMIN_CLAVE)");

  const { data: evs } = await admin.req("GET", "/admin/events");
  let live = evs.events.find((e) => e.status === "LIVE");
  if (!live) {
    const draft = evs.events.find((e) => e.status === "DRAFT");
    if (!draft) throw new Error("No hay eventos sin abrir. Crea uno desde el panel admin.");
    await admin.req("POST", `/admin/events/${draft.id}/open`);
    live = draft;
    console.log(`Evento "${draft.name}" abierto.`);
  }

  const suffix = Date.now().toString(36).slice(-3);
  const players = [];
  for (let i = 0; i < COUNT; i += 1) {
    const d = new Device();
    const name = `${NAMES[i % NAMES.length]}${i >= NAMES.length ? i : ""}`.slice(0, 16) + suffix;
    const r = await d.req("POST", "/auth/entrar", { usuario: name, clave: "1234" });
    if (r.status !== 201) {
      console.warn(`registro ${name}: ${r.status} ${r.data?.error}`);
      continue;
    }
    d.player = r.data.player;
    players.push(d);
  }
  console.log(`${players.length} jugadores de demo creados.`);
  if (players.length < 10) throw new Error("Se necesitan al menos 10 jugadores para el bingo de demo");

  const { data: overview } = await admin.req("GET", "/admin/overview");
  if (!overview.round) {
    const start = await admin.req("POST", "/admin/rounds");
    if (start.status !== 201) throw new Error(`No se pudo empezar la ronda: ${start.data?.error}`);
    console.log(`Ronda ${start.data.round.number} con ${start.data.cards} cartillas. Cuenta regresiva...`);
    await sleep(5500);
  }

  for (const [idx, d] of players.entries()) {
    const current = await d.req("GET", "/game/current");
    if (!current.data?.card) continue;
    const signs = idx < 2 ? 9 : Math.floor(Math.random() * 7);
    const signers = shuffle(players.filter((p) => p !== d)).slice(0, signs);
    for (let pos = 0; pos < signers.length; pos += 1) {
      await d.req("POST", "/game/sign", { position: pos, code: signers[pos].player.code });
    }
  }
  console.log("Ronda en curso con 2 cartillas completas. Terminala desde el panel admin.");

  const { data: lb } = await admin.req("GET", "/public/leaderboard?limit=5");
  console.log("\nTop 5:");
  for (const r of lb.top) console.log(`  #${r.rank} ${r.player.name} · ${r.points} pts`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
