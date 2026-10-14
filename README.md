# Bingo GDG · GDG Arequipa

El bingo para romper el hielo en los eventos de GDG Arequipa. Cada asistente
recibe una cartilla de 9 casillas del tipo *"alguien que use Flutter"* y tiene
que conseguir una firma por casilla: cada persona solo puede firmarle una, así
que para completar hay que conocer a 9.

Sirve para **cualquier evento** (DevFest, I/O Extended, meetups): el admin crea
el evento, lo abre y desde ahí quien entre juega en ese evento.

## Cómo se juega

| Quién | Qué ve |
|---|---|
| **Jugador** | Tres pantallas: **Cartilla**, **Ranking** y **Mi cuenta**. Se registra con su nombre y un PIN, y recibe un **código de 6 letras**. |
| **Firmar** | Toca una casilla, escribe el código de quien la cumple y listo. Suma puntos por firma, por completar y extra si es de los 3 primeros. |
| **Admin** | En `/admin`, entrando **solo con un código**: abre y cierra eventos, empieza y reinicia rondas, y maneja jugadores. |
| **Proyector** | `/pantalla`: top 10 en vivo, la ronda en curso, la cuenta regresiva y los ganadores. |

**Rondas:** cuando el admin empieza una ronda, todos los jugadores del evento
ven una cuenta regresiva 5, 4, 3, 2, 1 y reciben una cartilla nueva. Se pueden
correr varias rondas por evento; los puntos se acumulan en el ranking.

**Sin cámara:** todo se hace escribiendo el código de 6 letras. Funciona igual
por HTTP en la red local del evento.

## Las preguntas se editan en el código

No hay pantallas para crear juegos ni preguntas: se edita un archivo.

| Archivo | Qué contiene |
|---|---|
| `bingo-backend/src/content/bingo.js` | Puntos (por firma, por completar, extra del podio) y las 30 preguntas de las casillas |

Los cambios valen para la siguiente ronda; la que está en curso no cambia.

## Pantallas

| Ruta | Para |
|---|---|
| `/` | Portada con el evento abierto |
| `/crear`, `/entrar` | Crear cartilla (nombre + PIN) o volver a entrar |
| `/cartilla`, `/ranking`, `/cuenta` | La app del jugador (celular) |
| `/admin` | Panel: **Evento**, **Ronda** y **Jugadores**. Entra solo con `ADMIN_CODE` |
| `/pantalla` | Proyector |

## Correr en local

Requisitos: Node 20.9+.

**Día a día** (desde la carpeta raíz `bingoBTP`, un solo comando):

```bash
npm run dev
```

Levanta la base de datos, aplica las migraciones pendientes y arranca API y web.
Cuando dice **"Bingo GDG listo"** abre http://localhost:3000. `Ctrl+C` apaga
todo. Desde el celular, en la misma WiFi: `http://192.168.x.x:3000`.

Si la base local quedó abierta de una sesión anterior: `npm --prefix bingo-backend run db:stop`.

**Primera vez en una PC nueva:**

```bash
npm run setup                                      # instala dependencias de ambos
cp bingo-backend/.env.example bingo-backend/.env   # y pon tu ADMIN_CODE
```

Entra a `/admin` con tu `ADMIN_CODE`, crea un evento y ábrelo.
Para verlo con datos: `npm run demo -- 24` (desde `bingo-backend`).

## Guía para el día del evento

**Antes**
1. Revisa las preguntas y los puntos en `bingo-backend/src/content/bingo.js`.
2. `/admin` → **Evento**: crea el evento (queda sin abrir).
3. Ensayo: `npm test` y `npm run loadtest -- 300 90` (ver [DEPLOY.md](DEPLOY.md)).

**En la entrada**
- `/admin` → **Evento** → **Abrir evento**: desde ahí, quien se registre entra a este evento.
- `/pantalla` en el proyector: muestra la dirección y un QR para abrirla con la cámara del celular.

**Durante**
- `/admin` → **Ronda** → **Empezar ronda**. Todos ven la cuenta regresiva a la vez.
- Mientras juegan, el panel muestra cuántos completaron, los ganadores y quiénes van más cerca.
- **Terminar ronda** cierra esa ronda; **Reiniciar: nueva ronda** reparte cartillas nuevas a todos.
- Puedes subir los puntos de la última ronda para dar chance de remontar.

**Al cierre**
- `/admin` → **Evento** → **Cerrar evento**: congela el ranking y guarda el puesto final de cada jugador.
- Premia al top 3 con `/pantalla` en el proyector.

**Si alguien olvida su PIN:** `/admin` → **Jugadores** → buscarlo → ponerle un PIN nuevo.

## Arquitectura

```
bingo-frontend/  Next.js 16 · estilo GDG/DevFest (fondo claro, tarjetas y pildoras)
bingo-backend/   Express 5 · Prisma 7 · Postgres
  src/content/bingo.js     preguntas y puntos (esto se edita)
  src/services/points.js   única puerta de entrada de puntos (idempotente)
  src/services/rounds.js   rondas: cuenta regresiva, reparto y cierre
  src/services/cards.js    cartillas, casillas y firmas
  src/realtime/hub.js      Server-Sent Events con reenvío al reconectar
  scripts/                 smoke-test, demo-players, load-test, base local
```

- **Jugador**: cookie firmada de 60 días (nombre + PIN para recuperarla en otro celular).
- **Admin**: cookie propia de 12 horas que se emite al escribir `ADMIN_CODE`. No hay cuenta de admin.
- **Tiempo real con SSE**, no WebSockets: pasa por el proxy `/api` de Vercel. Al
  reconectar, el servidor reenvía los eventos perdidos en vez de recargar todo.
- **Cuenta regresiva con la hora del servidor**: todos los celulares y el proyector
  cuentan sincronizados aunque sus relojes estén desfasados.
- **Puntos en un libro contable** con clave única por recompensa: nadie cobra dos veces.

Despliegue: ver [DEPLOY.md](DEPLOY.md).
