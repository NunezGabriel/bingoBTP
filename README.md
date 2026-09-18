# Misti Quest · GDG Arequipa

App para los eventos de GDG Arequipa. Cada asistente crea un personaje 8-bit que
**se queda con él entre eventos**: sube de nivel y guarda sus trofeos. En cada
evento suma puntos; al final, quien más sume se lleva los premios.

## Cómo se juega

**El jugador** ve solo cuatro pantallas: Inicio (su personaje, su código y sus
puntos), Contactos, Ranking y Mi cuenta. Cuando el admin inicia el bingo, aparece
un quinto botón: BINGO.

| Qué | Cómo funciona |
|---|---|
| **Código del jugador** | 6 letras. Todo se hace dictando o escribiendo códigos, sin cámara |
| **Contactos** | Escribes el código de alguien y quedan conectados. También pasa al firmarse el bingo. No dan puntos |
| **Bingo** (lo inicia el admin) | Todos los inscritos ven una cuenta regresiva 5, 4, 3, 2, 1 y reciben su cartilla de 9 casillas. Cada casilla la firma otra persona con su código. Puntos por firma, por completar y extra para los 3 primeros |
| **Misiones** (las da el staff) | El staff escribe el código del jugador y toca la misión: "hizo una pregunta en una charla" (repetible), "foto con un speaker" (una vez)... |
| **Casas** | Cada jugador elige una de 4 casas; al elegir ve cuántos miembros tiene cada una. Sus puntos suman a la Copa de Casas |

**Todo es por evento.** El admin abre un evento (por ejemplo, *DevFest 2026*) y
desde ese momento quien se registra, o entra con su cuenta de otro evento, queda
inscrito en él. El bingo solo incluye a sus inscritos: alguien que fue al DevFest
pero no vino al siguiente evento no aparece en su bingo. Cada jugador ve en "Mi
cuenta" a qué eventos fue, con su puesto y su trofeo.

## El contenido se edita en el código

No hay pantallas para crear juegos ni misiones: se editan dos archivos y listo.

| Archivo | Qué contiene |
|---|---|
| `bingo-backend/src/content/bingo.js` | Puntos del bingo y las 30 preguntas de las cartillas |
| `bingo-backend/src/content/missions.js` | Las misiones que da el staff (título, puntos, si es repetible) |

Los cambios se aplican al reiniciar la API (en local es automático) y valen para
el siguiente bingo; el que ya está en curso no cambia.

**Juegos nuevos**: cada juego es un tipo de `GameSession` con su lógica en
`bingo-backend/src/services/`. Al agregar uno, aparece en Admin → Bingo junto al
existente y reusa la cuenta regresiva y el reparto de puntos.

## Pantallas

| Ruta | Para |
|---|---|
| `/` | Portada |
| `/crear`, `/entrar` | Crear personaje o volver con nombre + PIN |
| `/inicio`, `/contactos`, `/ranking`, `/cuenta` | App del jugador (celular) |
| `/juego` | La cartilla del bingo mientras hay un juego en marcha |
| `/staff` | Staff: escribe el código de un jugador y le da puntos |
| `/admin` | Tres pestañas: **Evento**, **Bingo** y **Usuarios**. Nada más |
| `/pantalla` | **Proyector**: top 10, copa de casas, bingo en vivo, cuenta regresiva y ganadores |

## Correr en local

Requisitos: Node 20.9+.

**Día a día** (desde la carpeta raíz `bingoBTP`, un solo comando):

```bash
npm run dev
```

Levanta la base de datos, aplica las migraciones pendientes, y arranca API y web.
Cuando dice **"Misti Quest listo"** abre http://localhost:3000. `Ctrl+C` apaga
todo. Desde el celular, en la misma WiFi, entra con la IP de tu PC:
`http://192.168.x.x:3000`.

Si la base local quedó abierta de una sesión anterior: `npm --prefix bingo-backend run db:stop`.

**Primera vez en una PC nueva:**

```bash
npm run setup                                      # instala dependencias de ambos
cp bingo-backend/.env.example bingo-backend/.env   # y pon tu ADMIN_PIN
```

Entra a `/entrar` con `ADMIN_NICKNAME` y `ADMIN_PIN`, ve a **Admin → Evento**,
crea uno y ábrelo. Para verlo con vida: `npm run demo -- 24` (desde `bingo-backend`).

## Guía para el día del evento

**Antes**
1. Revisa `src/content/missions.js` y `src/content/bingo.js` con las misiones y preguntas de ese evento.
2. Admin → Evento: crea el evento (queda sin abrir).
3. Admin → Usuarios: busca a quienes darán puntos y tócales **Hacer staff**.
4. Ensayo: `npm test` y `npm run loadtest -- 300 90` (ver [DEPLOY.md](DEPLOY.md)).

**En la entrada**
- Admin → Evento → **Abrir evento**. Desde ahí, registros y logins quedan inscritos.
- `/pantalla` en el proyector: muestra la dirección para entrar y un QR para la cámara del celular.

**Durante**
- El staff usa `/staff`: el jugador le dicta su código y recibe sus puntos.
- Cuando quieras: Admin → Bingo → **INICIAR BINGO**. Todos ven la cuenta regresiva a la vez.
  **Terminar bingo** muestra los ganadores en el proyector.

**Al cierre**
- Admin → Evento → **Cerrar evento**: congela el ranking y entrega trofeos para siempre.
- Premia al top 3 y a la casa ganadora con `/pantalla` en el proyector.

**Si alguien olvida su PIN:** Admin → Usuarios → buscarlo → ponerle un PIN nuevo. No pierde nada.

## Arquitectura

```
bingo-frontend/  Next.js 16 · arte 8-bit dibujado en código (lib/sprites.ts)
bingo-backend/   Express 5 · Prisma 7 · Postgres
  src/content/             preguntas del bingo y misiones (esto se edita)
  src/services/points.js   única puerta de entrada de puntos (idempotente)
  src/services/games.js    juegos que inicia el admin (hoy: bingo)
  src/realtime/hub.js      Server-Sent Events con reenvío al reconectar
  scripts/                 smoke-test, demo-players, load-test, base local
```

- **Sesión en cookie firmada de 60 días**: recargar o cerrar el navegador no pierde nada.
- **Tiempo real con SSE**, no WebSockets: pasa por el proxy `/api` de Vercel. Al
  reconectar, el servidor reenvía los eventos perdidos en vez de recargar todo.
- **Cuenta regresiva con la hora del servidor**: todos los celulares y el proyector
  cuentan sincronizados aunque sus relojes estén desfasados.
- **Puntos en un libro contable** con clave única por recompensa: nadie cobra dos veces,
  aunque el celular reintente.

Despliegue: ver [DEPLOY.md](DEPLOY.md).
