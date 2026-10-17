# Como se trabaja en este repo

Esto es lo que no se ve leyendo el codigo. Para que hace la app y como se usa,
el [README](README.md); para subirla, [DEPLOY.md](DEPLOY.md).

## Arrancar

Un solo comando, desde la raiz:

```bash
npm run dev
```

Levanta base, API (3001) y web (3000) en ese orden y espera a que cada una
responda. `Ctrl+C` apaga todo.

Dos cosas que parecen fallas y no lo son:

- **La primera vez de cada dia tarda 1 a 3 minutos sin imprimir nada.**
  `prisma dev` se descarga su motor una vez al dia en una carpeta temporal.
  Necesita internet.
- **Si al agregar o borrar una pagina todas las rutas de un grupo responden
  404**, el servidor de desarrollo se quedo con el manifiesto viejo: borra
  `bingo-frontend/.next` y arranca de nuevo. El script ya borra solo un build
  de produccion que haya quedado ahi, pero no detecta esto.

Si la base local quedo abierta de una sesion anterior:
`npm --prefix bingo-backend run db:stop`.

## Reglas del proyecto

- **El contenido vive en el codigo**, nunca en la base ni en una pantalla de
  administracion: preguntas del bingo, misiones y personajes estan en
  `bingo-backend/src/content/`. Antes de agregar un formulario o un ajuste,
  preguntarse si basta una constante ahi.
- **Los roles son estrictos.** Un admin no juega (403 en juego, lobby y
  tarjeta) y un jugador nunca ve una puerta al panel. El rol se lee de la base
  en cada peticion, no viaja en la cookie.
- **Los puntos entran por una sola puerta**, `services/points.js`, dentro de
  una transaccion y con clave unica por recompensa. Nunca sumar puntos por
  fuera.
- **Nada de dibujos en archivos de imagen.** La plaza y los personajes se
  dibujan por codigo en `bingo-frontend/lib/scene.ts` y `lib/sprites.ts`. Es lo
  que permite que todo pese casi nada en la WiFi del evento.
- **Comentar el porque, no el que**, y en espanol sin tildes en el codigo (en
  los .md si llevan). Los comentarios explican decisiones: por que el lobby va
  por WebSocket y el juego por SSE, por que el cartel del avion se dibuja
  columna por columna, por que el telon del escenario es claro.

## El lobby corre 60 veces por segundo

Es la pantalla mas cara de la app y esta pensada para un celular de gama baja.
Antes de agregarle algo:

- Lo que no cambia se pinta **una sola vez** en un canvas aparte (el cielo, el
  suelo con sus organizadores) y despues solo se copia el pedazo visible.
- Lo que se mueve (avion, pantalla voladora, confeti, gente) se dibuja por
  cuadro, y conviene que salga de una formula en funcion del tiempo en vez de
  una lista de objetos que haya que actualizar.
- Nada de `measureText` ni de abrir caminos (`beginPath`) por persona y por
  cuadro: eso ya mordio una vez.

## Pruebas

Con la app corriendo, desde `bingo-backend`:

```bash
npm test          # 88 verificaciones de punta a punta
npm run flowtest  # 39 del flujo nuevo: roles, lobby y misiones
```

Ambas crean sus datos y los borran. `npm test` se niega a correr si hay un
evento real abierto. **Nunca correrlas contra la base de produccion.**

Si se cambian los ids de los personajes en `content/skins.js`, hay que
actualizar los que usan las pruebas.

## Al tocar el esquema

Las migraciones son `ALTER` sobre la base que ya existe, no una base nueva:
la de produccion viene arrastrando datos de los eventos anteriores. Antes de
desplegar un cambio de esquema, mirar `npx prisma migrate status` contra ella.

## Git

No subir nada sin que lo pidan. El trabajo va en commits en espanol que
expliquen la decision, no la lista de archivos tocados.
