/**
 * Prueba de punta a punta del flujo nuevo: entrar, personaje, lobby, misiones
 * y separacion de roles. Crea sus propios datos y los borra al final.
 *
 *   node scripts/flow-test.js            (con la API corriendo en :3001)
 *   API=http://localhost:3101 node scripts/flow-test.js
 */
require("dotenv").config({ quiet: true });
const WebSocket = require("ws");

const API = process.env.API || "http://localhost:3001";
const WS = (process.env.WS || API.replace(/^http/, "ws")) + "/ws/lobby";
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_CLAVE = process.env.ADMIN_CLAVE || process.env.ADMIN_CODE || "";
const RUN = Math.random().toString(36).slice(2, 6);

let ok = 0;
let fail = 0;
const check = (label, condition, extra = "") => {
  if (condition) {
    ok += 1;
    console.log(`  ok   ${label}`);
  } else {
    fail += 1;
    console.log(`  FALLA ${label} ${extra}`);
  }
};

/** Un "celular": guarda sus cookies como lo haria un navegador. */
class Device {
  constructor(label) {
    this.label = label;
    this.cookies = new Map();
  }

  async req(method, path, body, { csrf = true } = {}) {
    const headers = { "content-type": "application/json" };
    if (csrf) headers["x-bg"] = "1";
    if (this.cookies.size) {
      headers.cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
    }
    const res = await fetch(`${API}/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const raw of res.headers.getSetCookie?.() ?? []) {
      const [pair] = raw.split(";");
      const eq = pair.indexOf("=");
      this.cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    return { status: res.status, data };
  }

  get = (p) => this.req("GET", p);
  post = (p, b) => this.req("POST", p, b ?? {});
  del = (p) => this.req("DELETE", p);
}

/** Conecta al lobby y devuelve lo que vaya llegando. */
function joinLobby(ticket) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS}?ticket=${encodeURIComponent(ticket)}`);
    const mensajes = [];
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("el lobby no respondio en 5 s"));
    }, 5000);

    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw));
      mensajes.push(msg);
      if (msg.t === "welcome") {
        // Se mueve y saluda, y esperamos a ver la foto del lobby.
        ws.send(JSON.stringify({ t: "m", x: 500, y: 400, d: 3, w: true }));
        ws.send(JSON.stringify({ t: "e" }));
      }
      if (msg.t === "s") {
        clearTimeout(timer);
        setTimeout(() => {
          ws.close();
          resolve(mensajes);
        }, 50);
      }
    });
    ws.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
  });
}

async function main() {
  console.log(`\nFlujo nuevo contra ${API}\n`);
  if (!ADMIN_CLAVE) throw new Error("Falta ADMIN_CLAVE (o ADMIN_CODE) en el entorno");

  /* ---------- admin ---------- */
  console.log("Admin");
  const admin = new Device("admin");
  const malo = await admin.post("/auth/entrar", { usuario: ADMIN_USER, clave: "0000000000" });
  check("clave incorrecta -> 401", malo.status === 401, `(${malo.status})`);

  const entra = await admin.post("/auth/entrar", { usuario: ADMIN_USER, clave: ADMIN_CLAVE });
  check("el admin entra por la misma puerta", entra.status === 200, `(${entra.status})`);
  check("y la app sabe que es admin", entra.data?.player?.role === "ADMIN");

  const overview = await admin.get("/admin/overview");
  check("ve el panel", overview.status === 200, `(${overview.status})`);
  check("el panel reporta cuanta gente hay en el lobby", typeof overview.data?.lobby === "number");

  const adminJuega = await admin.get("/game/current");
  check("un admin NO juega (403)", adminJuega.status === 403, `(${adminJuega.status})`);
  const adminTarjeta = await admin.get("/me/misiones");
  check("un admin NO tiene tarjeta (403)", adminTarjeta.status === 403, `(${adminTarjeta.status})`);

  // Hace falta un evento abierto para validar misiones.
  let event = overview.data?.event ?? null;
  let eventoCreado = null;
  if (!event) {
    const creado = await admin.post("/admin/events", { name: `Prueba flujo ${RUN}` });
    eventoCreado = creado.data?.event ?? null;
    await admin.post(`/admin/events/${eventoCreado.id}/open`);
    event = eventoCreado;
  }
  check("hay un evento abierto", Boolean(event));

  /* ---------- jugador ---------- */
  console.log("\nJugador");
  const phone = new Device("p1");
  const nuevo = await phone.post("/auth/entrar", { usuario: `flow${RUN}a`, clave: "1234" });
  check("cuenta nueva con usuario + clave -> 201", nuevo.status === 201, `(${nuevo.status})`);
  check("avisa que es cuenta nueva", nuevo.data?.nuevo === true);
  check("nace sin personaje", nuevo.data?.player?.skin === null);
  check("y con rol de jugador", nuevo.data?.player?.role === "PLAYER");

  const mismaClaveMal = await new Device("x").post("/auth/entrar", {
    usuario: `flow${RUN}a`,
    clave: "9999",
  });
  check("el mismo usuario con otra clave -> 401", mismaClaveMal.status === 401, `(${mismaClaveMal.status})`);

  const vuelve = await new Device("p1b").post("/auth/entrar", { usuario: `FLOW${RUN}A`, clave: "1234" });
  check("vuelve a entrar sin importar mayusculas", vuelve.status === 200, `(${vuelve.status})`);
  check("y no crea otra cuenta", vuelve.data?.nuevo === false);

  const panelAjeno = await phone.get("/admin/overview");
  check("un jugador NO entra al panel (403)", panelAjeno.status === 403, `(${panelAjeno.status})`);

  const skins = await phone.get("/me/skins");
  check("ve los personajes", (skins.data?.skins?.length ?? 0) >= 5, `(${skins.data?.skins?.length})`);

  const malSkin = await phone.post("/me/skin", { skin: "dragon" });
  check("un personaje inventado -> 400", malSkin.status === 400, `(${malSkin.status})`);

  const elige = await phone.post("/me/skin", { skin: "rocoto" });
  check("elige personaje", elige.data?.player?.skin === "rocoto");

  /* ---------- lobby ---------- */
  console.log("\nLobby");
  const sinTicket = await new Device("anon").post("/me/lobby-ticket");
  check("sin sesion no dan ticket -> 401", sinTicket.status === 401, `(${sinTicket.status})`);

  const ticket = (await phone.post("/me/lobby-ticket")).data?.ticket;
  check("el jugador recibe su ticket", typeof ticket === "string" && ticket.length > 20);

  const mensajes = await joinLobby(ticket);
  const welcome = mensajes.find((m) => m.t === "welcome");
  const foto = mensajes.find((m) => m.t === "s");
  check("entra al lobby y recibe la bienvenida", Boolean(welcome));
  check("con su posicion y el tamano del escenario", welcome?.world?.w > 0 && welcome?.you?.id > 0);
  check("y le llegan las fotos del lobby", Boolean(foto));
  check("que lo incluyen a el", (foto?.p ?? []).some((row) => row[0] === welcome.you.id));

  const ticketAdmin = await admin.post("/me/lobby-ticket");
  check("el admin no recibe ticket de lobby -> 403", ticketAdmin.status === 403, `(${ticketAdmin.status})`);

  /* ---------- misiones ---------- */
  console.log("\nMisiones");
  const tarjeta = await phone.get("/me/misiones");
  check("el jugador ve su tarjeta", tarjeta.status === 200, `(${tarjeta.status})`);
  check("con 4 misiones sin hacer", tarjeta.data?.missions?.length === 4 && tarjeta.data.done === 0);
  check("y con su codigo para el QR", /^[A-Z0-9]{6}$/.test(tarjeta.data?.code ?? ""));

  const code = tarjeta.data.code;
  const ids = tarjeta.data.missions.map((m) => m.id);

  const validaJugador = await phone.post("/admin/missions/validate", { code, missionId: ids[0] });
  check("un jugador no puede validarse solo -> 403", validaJugador.status === 403, `(${validaJugador.status})`);

  const v1 = await admin.post("/admin/missions/validate", { code, missionId: ids[0] });
  check("el admin valida escaneando el codigo", v1.status === 200, `(${v1.status})`);
  check("y la tarjeta queda en 1 de 4", v1.data?.card?.done === 1);

  const v1otra = await admin.post("/admin/missions/validate", { code, missionId: ids[0] });
  check("la misma mision dos veces -> 409", v1otra.status === 409, `(${v1otra.status})`);

  const inventada = await admin.post("/admin/missions/validate", { code, missionId: "volar" });
  check("una mision que no existe -> 404", inventada.status === 404, `(${inventada.status})`);

  const nadie = await admin.post("/admin/missions/validate", { code: "ZZZZZZ", missionId: ids[1] });
  check("un codigo de nadie -> 404", nadie.status === 404, `(${nadie.status})`);

  for (const id of ids.slice(1)) {
    await admin.post("/admin/missions/validate", { code, missionId: id });
  }
  const completa = await phone.get("/me/misiones");
  check("completa las cuatro", completa.data?.done === 4 && completa.data?.completa === true);

  const puntos = (await phone.get("/me")).data?.standing?.points ?? 0;
  check("y cobro los puntos de las misiones mas el bono", puntos >= 200, `(${puntos} pts)`);

  const reporte = await admin.get("/admin/missions/report");
  check("el reporte lo lista como tarjeta completa", (reporte.data?.completas ?? []).some((p) => p.player.name === nuevo.data.player.name));

  /* ---------- limpieza ---------- */
  console.log("\nLimpieza");
  const borrado = await admin.del(`/admin/players/${nuevo.data.player.id}`);
  check("se borra el jugador de prueba", borrado.status === 200, `(${borrado.status})`);
  if (eventoCreado) {
    await admin.post(`/admin/events/${eventoCreado.id}/close`);
    const borradoEvento = await admin.del(`/admin/events/${eventoCreado.id}`);
    check("y el evento de prueba", borradoEvento.status === 200, `(${borradoEvento.status})`);
  }

  console.log(`\n${ok} bien, ${fail} mal\n`);
  process.exitCode = fail ? 1 : 0;
}

main().catch((error) => {
  console.error("\nLa prueba se cayo:", error.message);
  process.exitCode = 1;
});
