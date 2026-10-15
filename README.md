# Bingo GDG · GDG Arequipa

La app de los eventos de GDG Arequipa. Entras con un usuario, eliges tu
personaje y apareces en la **Plaza de Armas** con el Misti al fondo. Ahi
esperas, te mueves y saludas; cuando el admin empieza el **bingo**, todos los
que estan en la plaza reciben su cartilla a la vez. Y durante todo el evento
llevas una **tarjeta de 4 misiones** que los organizadores validan escaneando
tu QR.

Sirve para **cualquier evento** (DevFest, I/O Extended, meetups): el admin crea
el evento, lo abre y desde ahi quien entre juega en ese evento.

## Las tres partes

| | |
|---|---|
| **Lobby** | Plaza de Armas en pixel art. Te mueves con el teclado o con la cruceta en pantalla, tu nombre va sobre tu personaje y puedes saludar cada 30 segundos. Es la pantalla de inicio: de ahi sales al bingo, al ranking y a tu tarjeta. |
| **Bingo** | Cartilla de 9 casillas del tipo *"alguien que use Flutter"*. Tocas una casilla, aparece la pregunta y escribes el codigo de 6 letras de quien la cumple. Cada persona solo puede firmarte una, asi que para completar hay que conocer a 9. |
| **Misiones** | Cuatro acciones del evento (redes, preguntar a un ponente, WhatsApp, subir una historia). El participante las cumple y un organizador **escanea su QR** para validarlas. Al completar las cuatro gana puntos extra y entra al premio del final. |

## Como entra la gente

Una sola pantalla: **usuario y clave de 4 numeros**. Si el usuario no existe, la
cuenta se crea ahi mismo; si existe, valida la clave. Sin correo, sin
confirmaciones y sin elegir entre "entrar" o "registrarse": en la puerta de un
evento cada toque de mas es una persona menos que llega a jugar.

La sesion dura 10 dias, asi que recargar la pagina o cerrar el navegador no
pierde nada. Si alguien olvida su clave, el admin se la reinicia desde el panel.

**Los roles son estrictos.** Un admin solo ve su panel: no tiene cartilla, ni
lobby, ni tarjeta. Un jugador nunca ve una puerta al panel. La cuenta de admin
no se registra desde la app: la crea el seeder con `ADMIN_USER` y `ADMIN_CLAVE`.

## Pantallas

| Ruta | Para |
|---|---|
| `/` | Portada con el evento abierto |
| `/entrar` | La unica puerta: usuario + clave |
| `/personaje` | Elegir personaje (una sola vez) |
| `/lobby` | La plaza |
| `/cartilla` | El bingo de la ronda en curso |
| `/misiones` | La tarjeta y el QR que te escanean |
| `/ranking`, `/cuenta` | Puntos y cuenta |
| `/admin` | Panel: **Evento**, **Ronda**, **Escaner** y **Jugadores** |
| `/pantalla` | Proyector |

## El contenido se edita en el codigo

No hay pantallas para crear juegos, misiones ni personajes: se editan archivos.

| Archivo | Que contiene |
|---|---|
| `bingo-backend/src/content/bingo.js` | Puntos y las 30 preguntas de las casillas |
| `bingo-backend/src/content/missions.js` | Las 4 misiones y el bono por completarlas |
| `bingo-backend/src/content/skins.js` | Los personajes (el dibujo esta en `bingo-frontend/lib/sprites.ts`) |

Los cambios valen para la siguiente ronda; la que esta en curso no cambia.

## Correr en local

Requisitos: Node 20.9+.

**Dia a dia** (desde la carpeta raiz `bingoBTP`, un solo comando):

```bash
npm run dev
```

Levanta la base de datos, aplica las migraciones pendientes y arranca API y web.
Cuando dice **"Bingo GDG listo"** abre http://localhost:3000. `Ctrl+C` apaga
todo. Desde el celular, en la misma WiFi: `http://192.168.x.x:3000`.

> La primera vez de cada dia, `prisma dev` descarga su motor en silencio: son
> uno a tres minutos sin una sola linea en pantalla. No esta colgado, y
> **necesita internet**. Si la base local quedo abierta de una sesion anterior:
> `npm --prefix bingo-backend run db:stop`.

**Primera vez en una PC nueva:**

```bash
npm run setup                                      # instala dependencias de ambos
cp bingo-backend/.env.example bingo-backend/.env   # pon tu ADMIN_CLAVE
cp bingo-frontend/.env.example bingo-frontend/.env.local
npm --prefix bingo-backend run seed                # crea la cuenta de admin
```

Entra a `/entrar` con `ADMIN_USER` y `ADMIN_CLAVE`, crea un evento y abrelo.
Para verlo con datos: `npm run demo -- 24` (desde `bingo-backend`).

## Guia para el dia del evento

**Antes**
1. Revisa preguntas, misiones y puntos en `bingo-backend/src/content/`.
2. `/admin` → **Evento**: crea el evento (queda sin abrir).
3. Ensayo: `npm test`, `npm run flowtest` y `npm run loadtest -- 300 90` (ver [DEPLOY.md](DEPLOY.md)).

**En la entrada**
- `/admin` → **Evento** → **Abrir evento**.
- `/pantalla` en el proyector: muestra la direccion y un QR para entrar.

**Durante**
- La gente espera en el lobby. `/admin` → **Ronda** → **Empezar ronda**: todos ven la cuenta regresiva a la vez.
- **Terminar ronda** cierra esa ronda; **Reiniciar: nueva ronda** reparte cartillas nuevas y devuelve a todos al lobby, asi los que llegaron tarde entran a la siguiente.
- `/admin` → **Escaner**: eliges que mision estas validando y escaneas en fila. Si la camara no abre, escribes el codigo de 6 letras.

**Al cierre**
- `/admin` → **Evento** → **Cerrar evento**: congela el ranking y guarda el puesto final.
- Premia al top 3 con `/pantalla`, y reparte los premios de las tarjetas completas (salen en el panel).

**Si alguien olvida su clave:** `/admin` → **Jugadores** → buscarlo → ponerle una nueva.

## Arquitectura

```
bingo-frontend/  Next.js 16 · estilo GDG/DevFest
  lib/sprites.ts           los personajes, pixel por pixel
  lib/scene.ts             la Plaza de Armas y el Misti (dos capas, con parallax)
  lib/lobby.ts             cliente del WebSocket del lobby
bingo-backend/   Express 5 · Prisma 7 · Postgres
  src/content/             preguntas, misiones y personajes (esto se edita)
  src/realtime/hub.js      Server-Sent Events con reenvio al reconectar
  src/realtime/lobby.js    WebSocket del lobby, por cuadricula para aguantar 300
  src/services/points.js   unica puerta de entrada de puntos (idempotente)
  src/services/rounds.js   rondas: cuenta regresiva, reparto y cierre
  src/services/cards.js    cartillas, casillas y firmas
  src/services/missions.js la tarjeta y su validacion por QR
  scripts/                 smoke-test, flow-test, demo-players, load-test, base local
```

- **Sesion**: cookie firmada de 10 dias. El rol se lee de la base en cada peticion, asi quitarle el admin a alguien tiene efecto inmediato.
- **Tiempo real en dos canales**: SSE para el juego (puntos, rondas, ranking), que reenvia lo perdido al reconectar; y WebSocket solo para el lobby, que es donde el celular tambien habla.
- **Cuenta regresiva con la hora del servidor**: todos los celulares y el proyector cuentan sincronizados aunque sus relojes esten desfasados.
- **Puntos en un libro contable** con clave unica por recompensa: nadie cobra dos veces.
- **Las misiones quedan firmadas**: cada validacion guarda que admin la hizo, para poder auditar los premios.

Despliegue: ver [DEPLOY.md](DEPLOY.md).
