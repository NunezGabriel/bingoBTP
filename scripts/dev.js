/**
 * Levanta todo Misti Quest en local con un solo comando, desde la raiz:
 *
 *   npm run dev
 *
 * Orden: base de datos -> migraciones pendientes -> API -> web. Cada paso
 * espera a que el anterior responda. Ctrl+C apaga todo.
 */
const { spawn, execSync } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const isWindows = process.platform === "win32";
const COLORS = { db: "\x1b[35m", api: "\x1b[36m", web: "\x1b[33m", dev: "\x1b[32m" };
const RESET = "\x1b[0m";
const children = [];
let shuttingDown = false;

const log = (name, msg) => console.log(`${COLORS[name]}[${name}]${RESET} ${msg}`);

function portOpen(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    socket.setTimeout(1000);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function waitFor(label, check, timeoutMs) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`${label} no respondio en ${Math.round(timeoutMs / 1000)} s`);
}

function run(name, folder, script) {
  const child = spawn("npm", ["run", script], {
    cwd: path.join(ROOT, folder),
    shell: true,
    env: { ...process.env, FORCE_COLOR: "1" },
  });
  child.label = name;
  children.push(child);

  const pipe = (stream, out) => {
    let buffer = "";
    stream.on("data", (chunk) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop();
      for (const line of lines) {
        if (line.trim()) out.write(`${COLORS[name]}[${name}]${RESET} ${line}\n`);
      }
    });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);

  child.on("exit", (code) => {
    if (shuttingDown) return;
    log(name, `se detuvo (codigo ${code}). Apagando todo.`);
    shutdown(1);
  });
  return child;
}

function kill(child) {
  if (child.exitCode !== null) return;
  try {
    // En Windows npm abre subprocesos: hay que cerrar el arbol completo.
    if (isWindows) execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: "ignore" });
    else child.kill("SIGTERM");
  } catch {
    /* ya estaba cerrado */
  }
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  const db = children.find((child) => child.label === "db");
  for (const child of children) if (child !== db) kill(child);
  if (db) {
    // La base se apaga por las buenas para no dejar su candado tomado.
    try {
      execSync("npm run db:stop", {
        cwd: path.join(ROOT, "bingo-backend"),
        stdio: "ignore",
        timeout: 30_000,
      });
    } catch {
      /* si no respondio, se cierra a la fuerza abajo */
    }
    kill(db);
  }
  setTimeout(() => process.exit(code), 500);
}

process.on("SIGINT", () => {
  log("dev", "apagando...");
  shutdown(0);
});
process.on("SIGTERM", () => shutdown(0));

async function main() {
  // 1. Base de datos local
  if (await portOpen(52611)) {
    log("db", "ya estaba corriendo en el puerto 52611, la uso.");
  } else {
    log("db", "iniciando base de datos local...");
    run("db", "bingo-backend", "db");
    await waitFor("La base de datos", () => portOpen(52611), 120_000);
    log("db", "lista.");
  }

  // 2. Tablas al dia: aplica las migraciones pendientes (nunca borra datos).
  try {
    execSync("npx prisma migrate deploy", { cwd: path.join(ROOT, "bingo-backend"), stdio: "pipe" });
    log("db", "tablas al dia.");
  } catch (error) {
    log("db", `no se pudieron aplicar las migraciones:\n${error.stdout ?? ""}${error.stderr ?? ""}`);
    return shutdown(1);
  }

  // 3. API
  if (await portOpen(3001)) {
    log("api", "el puerto 3001 ya esta ocupado: cierra el otro backend y vuelve a intentar.");
    return shutdown(1);
  }
  log("api", "iniciando...");
  run("api", "bingo-backend", "dev");
  await waitFor(
    "La API",
    async () => {
      try {
        const res = await fetch("http://127.0.0.1:3001/api/health");
        return res.ok;
      } catch {
        return false;
      }
    },
    90_000,
  );

  // 4. Web
  if (await portOpen(3000)) {
    log("web", "el puerto 3000 ya esta ocupado: cierra el otro frontend y vuelve a intentar.");
    return shutdown(1);
  }
  log("web", "iniciando...");
  run("web", "bingo-frontend", "dev");
  await waitFor("La web", () => portOpen(3000), 120_000);

  console.log(`
${COLORS.dev}============================================${RESET}
  Misti Quest listo
  Juego:     http://localhost:3000
  Admin:     http://localhost:3000/admin
  Proyector: http://localhost:3000/pantalla
  Ctrl+C para apagar todo
${COLORS.dev}============================================${RESET}
`);
}

main().catch((error) => {
  log("dev", `error: ${error.message}`);
  shutdown(1);
});
