# Despliegue de Bingo GDG

Dos caminos, el mismo código:

| | Render + Vercel + Neon | Servidor propio (Proxmox/LXC + Docker) |
|---|---|---|
| Acceso | Público, desde datos móviles | Solo la red del servidor (hasta tener dominio y SSL) |
| HTTPS | Sí | Opcional: el juego usa códigos escritos, no la cámara |
| Latencia a la base | Depende de la región (ver abajo) | ~1 ms |
| Costo | Planes gratis se duermen y tienen poca CPU | Gratis, recursos del servidor |

---

## A) Render (API) + Vercel (web) + Neon (base)

### 1. La base de datos: la misma de siempre

No hace falta una base nueva. La migración `20260927203000_bingo_gdg` transforma el
esquema de la versión anterior en el de este bingo, y `prisma migrate deploy` la aplica
sola en cada despliegue.

- **Se conserva:** jugadores (la columna `nickname` pasa a `name`), eventos,
  inscripciones y el libro de puntos.
- **Se borra:** lo que ya no existe en el juego: conexiones, trofeos, cartillas y
  partidas de la versión anterior.

Si no estás seguro del estado de tu base, `npx prisma migrate status` te dice qué
migraciones tiene aplicadas antes de desplegar.

> **Si creas un proyecto de Neon, hazlo en la misma región que tu servicio de Render.**
> Cada acción del juego hace entre 1 y 8 consultas. Con la base en otro continente
> (~150 ms por consulta) firmar un bingo tarda más de un segundo; en la misma
> región, milisegundos. Este es el ajuste que más capacidad da, y es gratis.

### 2. API en Render

- Root directory: `bingo-backend`
- Build: `npm install && npx prisma generate && npx prisma migrate deploy`
- Start: `node src/app.js`
- Variables de entorno:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | Cadena de Neon (usa el endpoint `-pooler`) |
| `DB_POOL_MAX` | `20` |
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `FRONTEND_URL` | `https://tu-app.vercel.app` |
| `TRUST_PROXY` | `2` (el tráfico entra por Vercel y luego por Render) |
| `ADMIN_CODE` | El codigo con el que entras a `/admin` (elige uno largo) |

Las preguntas del bingo no van en la base: se editan en
`bingo-backend/src/content/bingo.js` y viajan con el despliegue.

### 3. Web en Vercel

- Root directory: `bingo-frontend`
- Variables: `NEXT_PUBLIC_API_URL=/api` y `BACKEND_URL=https://tu-api.onrender.com`

### Plan gratis de Render: cuidado

Se duerme tras 15 minutos sin tráfico y el primer acceso tarda ~1 minuto en despertar.
**Abre la app media hora antes del evento** y deja la pantalla gigante abierta
(su conexión en vivo lo mantiene despierto).

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

### Sin cámara: funciona igual por HTTP

La app no usa la cámara: las firmas se hacen escribiendo el código de 6 letras de
cada jugador. Por eso funciona completa también por HTTP en la red local. El QR
del proyector solo abre la página con la cámara nativa del celular, y la
dirección se muestra escrita al lado.

### Tiempo real y nginx

Toda la app (puntos, cuenta regresiva de la ronda, pantalla gigante) llega por Server-Sent Events.
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
npm test                     # 80 verificaciones de punta a punta (crea y borra sus datos)
npm run demo -- 24           # llena el evento abierto con 24 jugadores y una ronda en curso
npm run loadtest -- 300 90   # 300 celulares simultáneos durante 90 s (crea y borra sus datos)
```

`npm test` y la prueba de carga se niegan a correr si hay un evento real abierto.
La prueba de carga reporta latencias p50/p95/p99 por acción, errores, a cuántos
celulares llegó la cuenta regresiva y cuánto tarda reiniciar la ronda con todos jugando. Córrela contra la misma base que
usarás el día del evento: ahí se ve la capacidad real. En local, con la base de
desarrollo (una sola conexión), las latencias salen altas: no representan producción.
