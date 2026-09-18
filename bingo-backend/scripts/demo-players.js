/**
 * Llena el evento abierto con jugadores de demostracion que juegan de verdad
 * a traves de la API: contactos, misiones del staff y un bingo en curso. Sirve
 * para ensayar la pantalla gigante y el panel admin antes del evento.
 *
 *   npm run demo -- 24
 *
 * Si no hay evento abierto, abre el primero sin abrir. Solo para desarrollo o ensayos.
 */
require("dotenv").config({ quiet: true });
const MISSIONS = require("../src/content/missions");

const API = (process.env.API_URL || "http://localhost:3001").replace(/\/$/, "");
const COUNT = Number(process.argv[2] || 24);
const CLASSES = ["esqueleto", "mago", "caballero", "robot", "ninja", "fantasma", "slime", "astronauta"];
const HOUSES = ["azul", "rojo", "amarillo", "verde"];
const NAMES = [
  "Pixelita", "ByteMan", "LaVicuna", "DevCondor", "Kotlina", "NullPointer", "SrDeploy", "GlitchQueen",
  "Rocoto404", "MistiDev", "CuyCoder", "Chupito", "LlamaDrama", "FlutterFly", "StackTrace", "Queso_Helado",
  "Adobo_JS", "Rawr_Dev", "Colca_Bit", "Yanahuara", "Solcito", "Sillar", "PumaByte", "Chachani",
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Device {
  constructor() {
    this.cookie = "";
  }
  async req(method, path, body) {
    const res = await fetch(`${API}/api${path}`, {
      method,
      headers: { "Content-Type": "application/json", "x-mq": "1", ...(this.cookie ? { Cookie: this.cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.getSetCookie?.() ?? [];
    if (set.length) this.cookie = set[0].split(";")[0];
    const text = await res.text();
    return { status: res.status, data: text ? JSON.parse(text) : null };
  }
}

async function main() {
  const admin = new Device();
  const login = await admin.req("POST", "/auth/login", {
    nickname: process.env.ADMIN_NICKNAME,
    pin: process.env.ADMIN_PIN,
  });
  if (login.status !== 200) throw new Error("No se pudo entrar como admin (ADMIN_NICKNAME / ADMIN_PIN)");

  const { data: evs } = await admin.req("GET", "/admin/events");
  if (!evs.live) {
    const draft = evs.events.find((e) => e.status === "DRAFT");
    if (!draft) throw new Error("No hay eventos sin abrir. Crea uno desde el panel admin.");
    await admin.req("POST", `/admin/events/${draft.id}/open`);
    console.log(`Evento "${draft.name}" abierto.`);
  }

  const suffix = Date.now().toString(36).slice(-3);
  const players = [];
  for (let i = 0; i < COUNT; i += 1) {
    const d = new Device();
    const nickname = `${NAMES[i % NAMES.length]}${i >= NAMES.length ? i : ""}`.slice(0, 13) + suffix;
    const r = await d.req("POST", "/auth/register", {
      nickname,
      pin: "1234",
      avatarClass: pick(CLASSES),
      // Casas desparejas a proposito: asi se nota el contador al elegir.
      avatarHouse: HOUSES[Math.min(3, Math.floor(Math.random() * 5))],
    });
    if (r.status !== 201) {
      console.warn(`registro ${nickname}: ${r.status} ${r.data?.error}`);
      continue;
    }
    d.player = r.data.player;
    players.push(d);
  }
  console.log(`${players.length} jugadores de demo creados.`);
  if (players.length < 10) throw new Error("Se necesitan al menos 10 jugadores para el bingo de demo");

  // Contactos al azar: unos muy sociales, otros timidos
  let contacts = 0;
  for (const d of players) {
    for (const other of shuffle(players).slice(0, Math.floor(Math.random() * 6))) {
      if (other === d) continue;
      const r = await d.req("POST", "/me/contacts", { code: other.player.code });
      if (r.status === 201) contacts += 1;
    }
  }
  console.log(`${contacts} contactos.`);

  // Misiones: el admin hace de staff
  let awards = 0;
  for (const d of shuffle(players).slice(0, Math.ceil(players.length * 0.7))) {
    for (let i = 0; i < 1 + Math.floor(Math.random() * 3); i += 1) {
      const r = await admin.req("POST", "/staff/award", { code: d.player.code, mission: pick(MISSIONS).key });
      if (r.status === 200) awards += 1;
    }
  }
  console.log(`${awards} misiones entregadas.`);

  // Bingo: el admin lo inicia, pasa la cuenta regresiva y la gente firma
  const { data: game } = await admin.req("GET", "/admin/game");
  if (!game.running) {
    const start = await admin.req("POST", "/admin/game/bingo/start");
    if (start.status !== 201) throw new Error(`No se pudo iniciar el bingo: ${start.data?.error}`);
    console.log(`Bingo iniciado (${start.data.boards} cartillas). Cuenta regresiva...`);
    await sleep(5500);
  }
  for (const [idx, d] of players.entries()) {
    const current = await d.req("GET", "/game/current");
    if (!current.data?.board) continue;
    const signs = idx < 2 ? 9 : Math.floor(Math.random() * 7);
    const signers = shuffle(players.filter((p) => p !== d)).slice(0, signs);
    for (let pos = 0; pos < signers.length; pos += 1) {
      await d.req("POST", "/game/bingo/sign", { position: pos, code: signers[pos].player.code });
    }
  }
  console.log("Bingo en curso con 2 cartillas completas. Terminalo desde el panel admin.");

  const { data: lb } = await admin.req("GET", "/public/leaderboard?limit=5");
  console.log("\nTop 5:");
  for (const r of lb.top) console.log(`  #${r.rank} ${r.player.nickname} (${r.player.avatarHouse}) ${r.points} pts`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
