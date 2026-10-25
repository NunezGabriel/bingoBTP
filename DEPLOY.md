# Despliegue de Bingo GDG

Dos caminos, el mismo código:

| | Render + Neon | Servidor propio (Proxmox/LXC + Docker) |
|---|---|---|
| Acceso | Público, desde datos móviles | Solo la red del servidor (hasta tener dominio y SSL) |
| HTTPS | Sí | Opcional: el juego usa códigos escritos, no la cámara |
| Latencia a la base | Depende de la región (ver abajo) | ~1 ms |
| Costo | Planes gratis se duermen y tienen poca CPU | Gratis, recursos del servidor |

---

## A) Render (API y web) + Neon (base)

Dos servicios de Render sobre el mismo repositorio: uno corre la API desde
`bingo-backend` y otro la web desde `bingo-frontend`. La web reenvia `/api` a la
API con el rewrite de `next.config.ts`, asi que para el navegador todo sale del
mismo dominio: sin CORS y sin cookies entre sitios.

### 1. La base de datos: la misma de siempre

No hace falta una base nueva: la de Neon que ya existe sirve, y
`prisma migrate deploy` se encarga sola en cada despliegue.

Lo que esa base tiene hoy (octubre de 2026) es el bingo de marzo: `Usuario`,
`Ronda`, `Cartilla`, `Casilla`, `Firma`, `RelacionCasilla`, `session` y tres
migraciones propias. De esta app no tiene nada. Entonces:

- Las cuatro migraciones **crean sus tablas desde cero**. Ningún nombre choca
  con los de marzo, así que no hay nada que arreglar a mano.
- Las tablas de marzo **se quedan ahí sin usarse**. Prisma no las toca. Se
  pueden borrar cuando quieras, pero no estorban.
- `prisma migrate deploy` **no se queja** de que esas tres migraciones de marzo
  no estén en `prisma/migrations`: aplica las suyas y las deja en paz. Está
  probado contra una copia local de ese mismo estado.

Antes de desplegar un cambio de esquema, `npx prisma migrate status` con la
`DATABASE_URL` de producción dice qué tiene aplicado. Es solo lectura.

> **Si creas un proyecto de Neon, hazlo en la misma región que tu servicio de Render.**
> Cada acción del juego hace entre 1 y 8 consultas. Con la base en otro continente
> (~150 ms por consulta) firmar un bingo tarda más de un segundo; en la misma
> región, milisegundos. Este es el ajuste que más capacidad da, y es gratis.

### 2. API en Render

- Root directory: `bingo-backend`
- Build: `npm install --include=dev && npx prisma generate && npx prisma migrate deploy && npm run seed`
- Start: `node src/app.js`
- Rama: `main`, con auto-deploy encendido (Settings → Build & Deploy). Si está
  apagada, un push no sube nada y el servicio sigue sirviendo la versión vieja
  sin dar ningún error: se nota porque `/api/health` responde 404.
- Variables de entorno:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | Cadena de Neon (usa el endpoint `-pooler`) |
| `DB_POOL_MAX` | `20` |
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `FRONTEND_URL` | La URL del servicio web (`https://bingo-gdg.onrender.com`) |
| `TRUST_PROXY` | `2` (el tráfico entra por la web y de ahí a la API) |
| `ADMIN_USER` | Usuario de la cuenta de admin (por defecto `admin`) |
| `ADMIN_CLAVE` | Su clave: 8 caracteres o mas. La cuenta la crea el seeder |

Las preguntas del bingo, las misiones y los personajes no van en la base: se
editan en `bingo-backend/src/content/` y viajan con el despliegue.

> **`--include=dev` no es un descuido.** Render define `NODE_ENV=production`
> tambien durante el build, y con eso `npm install` se salta las
> devDependencies. Ahi viven el CLI de Prisma (la API) y Tailwind con
> TypeScript (la web): sin ellos el build falla con un `Cannot find module`
> que no dice nada sobre la causa.

El `npm run seed` del final del build es el que crea la cuenta de admin, y va
ahi porque el plan gratuito de Render no tiene shell. Corre en cada despliegue
y no molesta: si la clave ya es la del entorno no toca nada, y el evento de
ejemplo solo se crea si la base no tiene ninguno.

> **La clave del admin tiene que tener 8 caracteres o mas.** Con menos, la API
> se niega a arrancar en produccion y el despliegue queda caido. Ese codigo ya
> no abre solo un panel: es la cuenta que firma cada validacion de mision.

### 3. Web en Render

Otro Web Service, sobre el mismo repositorio y la misma rama.

- Root directory: `bingo-frontend`
- Language: **Node** (Render propone Docker porque encuentra un Dockerfile; ese
  es para el servidor propio, no para aquí)
- Build: `npm install --include=dev && npm run build`
- Start: `npm start`
- Misma región que la API
- Variables:

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_API_URL` | `/api` |
| `BACKEND_URL` | `https://tu-api.onrender.com` |
| `NEXT_PUBLIC_WS_URL` | `wss://tu-api.onrender.com/ws/lobby` |

> **El lobby va directo a la API, no por el rewrite.** El rewrite de `/api` no
> reenvia conexiones WebSocket: si `NEXT_PUBLIC_WS_URL` falta, la plaza se ve
> vacia (cada quien se ve solo a si mismo). El resto de la app sigue
> funcionando, por eso es facil que pase desapercibido.

> **`NEXT_PUBLIC_*` se hornea en el build.** Cambiarlas no tiene efecto hasta
> que vuelvas a desplegar.

### Plan gratis de Render: cuidado

Cada servicio se duerme tras 15 minutos sin tráfico y tarda ~1 minuto en
despertar. Son dos, así que el primero que entra puede esperar dos veces: la web
y después la API. **Abre la app media hora antes del evento** y deja la pantalla
gigante abierta (su conexión en vivo mantiene despierta a la API).

Las horas gratis (750 al mes) son de la cuenta, no de cada servicio: dos
servicios despiertos las gastan al doble de velocidad. No es que vayan más
lentos; cuando se acaban, los servicios gratis quedan suspendidos hasta el mes
siguiente. Un plan de pago quita las dos cosas: ni se duermen ni cuentan horas.

---

## B) Servidor propio con Docker Compose

| Servicio | Rol |
|---|---|
| `nginx` | Entrada en el puerto 80. `/api` va al backend, el resto al frontend |
| `frontend` | Next.js standalone |
| `backend` | Express + Prisma. Aplica migraciones solo al arrancar |
| `postgres` | Postgres 18 con volumen persistente |

### Requisitos del contenedor LXC

- **RAM: 2 GB** mínimo (4 GB si compilas dentro del contenedor)
- **CPU: 2 núcleos**
- **Disco: 20 GB**
- **Nesting activado** (necesario para Docker dentro de LXC)

### Pasos

> El build de la web descarga la tipografia (Google Fonts) una sola vez: el
> servidor necesita internet **al construir la imagen**. Ya construida, funciona sin internet.

```bash
apt update && apt install -y git
# Docker: https://docs.docker.com/engine/install/ubuntu/

cd /opt
git clone https://github.com/<tu-usuario>/bingoBTP.git
cd bingoBTP

cp .env.docker.example .env
nano .env                          # cambia contraseñas, secreto, admin e IP

docker compose up -d --build
docker compose ps                  # 4 servicios arriba, postgres "healthy"
curl http://localhost/api/health   # {"ok":true}
```

La primera vez, `SEED_ON_START=true` crea un evento de ejemplo (sin abrir). Las
preguntas del bingo van en el codigo, en `bingo-backend/src/content/bingo.js`.

### La cookie: el error que cuesta un evento

Si la cookie de sesión se marca `Secure`, el navegador **solo la acepta por HTTPS**.
Sirviendo por HTTP plano se descarta en silencio y **nadie puede iniciar sesión**.

- Por **HTTP** (red local): `COOKIE_SECURE=false`
- Por **HTTPS**: `COOKIE_SECURE=true`

### La cámara del escáner SÍ necesita HTTPS

El bingo funciona completo por HTTP porque las firmas se escriben a mano. El
**escáner de misiones no**: el navegador no da acceso a la cámara en una página
servida por HTTP plano. Por HTTP el organizador tendrá que escribir el código de
6 letras de cada participante, que valida exactamente igual pero es más lento.
Si vas a usar el escáner con la cámara, sirve la app por HTTPS.

### Sin cámara: el bingo funciona igual por HTTP

La app no usa la cámara: las firmas se hacen escribiendo el código de 6 letras de
cada jugador. Por eso funciona completa también por HTTP en la red local. El QR
del proyector solo abre la página con la cámara nativa del celular, y la
dirección se muestra escrita al lado.

### Tiempo real y nginx

El juego (puntos, cuenta regresiva, pantalla gigante) llega por Server-Sent Events,
y el lobby por WebSocket en `/ws/`.
`nginx/default.conf` trae `proxy_buffering off` y `proxy_read_timeout 24h` en
`/api/`. **Si alguien los quita, nada se actualiza en vivo.**

---

## Operación durante el evento

```bash
docker compose logs -f backend                               # ver qué pasa
docker compose restart backend                               # reiniciar sin perder datos
docker stats                                                 # CPU y RAM en vivo
docker compose exec backend node prisma/seed.js --reset --yes  # BORRA TODO
```

Para cambiar las preguntas o los puntos: edita `bingo-backend/src/content/bingo.js`,
vuelve a desplegar (`docker compose up -d --build backend`) y listo.

## Ensayo antes del evento

Con la app corriendo (nunca contra producción real):

```bash
cd bingo-backend
npm test                     # 88 verificaciones de punta a punta (crea y borra sus datos)
npm run flowtest             # 39 verificaciones del flujo nuevo: roles, lobby y misiones
npm run demo -- 24           # llena el evento abierto con 24 jugadores y una ronda en curso
npm run loadtest -- 300 90   # 300 celulares simultáneos durante 90 s (crea y borra sus datos)
# contra el destino real:
API_URL=https://tu-api.onrender.com ADMIN_USER=admin ADMIN_CLAVE=... npm run loadtest -- 300 90
```

`npm test` y la prueba de carga se niegan a correr si hay un evento real abierto.
La prueba de carga reporta latencias p50/p95/p99 por acción, errores, a cuántos
celulares llegó la cuenta regresiva y cuánto tarda reiniciar la ronda con todos jugando. Córrela contra la misma base que
usarás el día del evento: ahí se ve la capacidad real. En local, con la base de
desarrollo (una sola conexión), las latencias salen altas: no representan producción.
