/**
 * Base de datos local para desarrollo (Prisma Postgres local, sin Docker).
 *
 *   npm run db        -> la levanta (Ctrl+C para apagarla)
 *   npm run db:stop   -> la apaga si quedo corriendo sola
 *
 * Por que un script y no `prisma dev` directo: prisma dev abre ademas un
 * servidor auxiliar ("Prisma Streams") y le busca puerto leyendo la variable
 * PORT. prisma.config.ts carga el .env, donde PORT=3001 es el de la API, asi que
 * ese servidor se quedaba con el 3001 y la API ya no podia arrancar. Aqui le
 * damos un puerto propio.
 */
const { spawn, spawnSync } = require("node:child_process");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const CLI = path.join(ROOT, "node_modules", "prisma", "build", "index.js");
const NAME = "mistiquest";
const PORTS = ["--port", "52610", "--db-port", "52611", "--shadow-db-port", "52612"];
const env = { ...process.env, PORT: "52613", FORCE_COLOR: process.env.FORCE_COLOR ?? "1" };

if (process.argv.includes("stop")) {
  const result = spawnSync(process.execPath, [CLI, "dev", "stop", NAME], {
    cwd: ROOT,
    env,
    stdio: "inherit",
  });
  process.exit(result.status ?? 0);
}

// Ctrl+C tambien le llega a prisma dev: esperamos a que cierre limpio.
process.on("SIGINT", () => {});

function start(attempt = 1) {
  const child = spawn(process.execPath, [CLI, "dev", "--name", NAME, ...PORTS], {
    cwd: ROOT,
    env,
    stdio: ["inherit", "pipe", "pipe"],
  });

  // Si la base se acaba de cerrar a la fuerza, su candado tarda unos segundos
  // en liberarse. En vez de fallar, reintentamos.
  let locked = false;
  const forward = (stream, out) =>
    stream.on("data", (chunk) => {
      if (chunk.toString().includes("Lock file is already being held")) {
        locked = true;
        return;
      }
      out.write(chunk);
    });
  forward(child.stdout, process.stdout);
  forward(child.stderr, process.stderr);

  child.on("exit", (code) => {
    if (code !== 0 && locked && attempt < 6) {
      console.log("La base anterior aun se esta cerrando; reintento en 5 s...");
      setTimeout(() => start(attempt + 1), 5000);
      return;
    }
    if (locked) console.error("La base sigue bloqueada. Prueba `npm run db:stop` y vuelve a intentar.");
    process.exit(code ?? 0);
  });
}

start();
