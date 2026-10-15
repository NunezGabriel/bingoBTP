"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/session";
import { LobbyClient, type LobbyPlayer } from "@/lib/lobby";
import { guardarMusica, musica, musicaActiva } from "@/lib/music";
import { drawGround, drawPlane, drawSky, FLOOR, GROUND_TOP, P, SKY, WORLD } from "@/lib/scene";
import { drawSkin, skinOf } from "@/lib/sprites";
import { Icon } from "@/components/ui/Icon";

/**
 * El lobby: la Plaza de Armas donde se espera entre rondas.
 *
 * Todo el movimiento vive en refs y se dibuja con requestAnimationFrame. Si la
 * posicion estuviera en el estado de React, cada paso volveria a renderizar la
 * pantalla entera: con decenas de personajes en el canvas eso es inusable en
 * un celular.
 */

const SPEED = 150; // unidades del mundo por segundo
/** Cada cuanto cruza el avioncito, y cuanto tarda en cruzar. */
const AVION_CADA_MS = 48_000;
const AVION_DURA_MS = 15_000;

type Keys = { up: boolean; down: boolean; left: boolean; right: boolean };

export default function LobbyPage() {
  const { me } = useSession();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clientRef = useRef<LobbyClient | null>(null);
  const meRef = useRef({ x: WORLD.w / 2, y: WORLD.h * 0.9, d: 0, w: false, step: 0 });
  const keysRef = useRef<Keys>({ up: false, down: false, left: false, right: false });
  const skyRef = useRef<HTMLCanvasElement | null>(null);
  const groundRef = useRef<HTMLCanvasElement | null>(null);
  const cooldownRef = useRef(30000);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(1);
  const [emoteLeft, setEmoteLeft] = useState(0);
  // El boton muestra lo que la persona quiere, no lo que el navegador dejo
  // sonar: hasta el primer toque, el audio esta bloqueado y eso no es una
  // decision suya.
  const [musicaOn, setMusicaOn] = useState(() => musicaActiva());

  /* ---------- conexion ---------- */

  useEffect(() => {
    const client = new LobbyClient({
      onReady: (you, world, cooldown) => {
        meRef.current = { x: you.x, y: you.y, d: you.d, w: false, step: 0 };
        cooldownRef.current = cooldown;
        WORLD.w = world.w || WORLD.w;
        WORLD.h = world.h || WORLD.h;
        setReady(true);
        setError("");
        setTotal(client.total || 1);
      },
      onChange: () => setTotal(client.total || client.players.size + 1),
      onError: (message) => setError(message),
    });
    clientRef.current = client;
    void client.connect();
    return () => {
      client.close();
      clientRef.current = null;
    };
  }, []);

  /* ---------- musica ---------- */

  useEffect(() => {
    if (!musicaActiva()) return;
    // El navegador no deja sonar nada hasta que la persona toca la pantalla,
    // asi que se intenta ya y, si no, al primer toque.
    musica.start();
    const arrancar = () => musica.start();
    window.addEventListener("pointerdown", arrancar, { once: true });
    window.addEventListener("keydown", arrancar, { once: true });
    return () => {
      window.removeEventListener("pointerdown", arrancar);
      window.removeEventListener("keydown", arrancar);
    };
  }, []);

  // Al salir del lobby la musica se apaga: no tiene que seguir sonando en la cartilla.
  useEffect(() => () => musica.stop(), []);

  const toggleMusica = useCallback(() => {
    const on = musica.toggle();
    setMusicaOn(on);
    guardarMusica(on);
  }, []);

  /* ---------- teclado ---------- */

  useEffect(() => {
    const set = (code: string, down: boolean) => {
      const k = keysRef.current;
      if (code === "ArrowUp" || code === "KeyW") k.up = down;
      else if (code === "ArrowDown" || code === "KeyS") k.down = down;
      else if (code === "ArrowLeft" || code === "KeyA") k.left = down;
      else if (code === "ArrowRight" || code === "KeyD") k.right = down;
      else return false;
      return true;
    };
    const onDown = (e: KeyboardEvent) => {
      if (set(e.code, true)) e.preventDefault();
    };
    const onUp = (e: KeyboardEvent) => set(e.code, false);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  /* ---------- saludo ---------- */

  const emoteAtRef = useRef(0);
  const saludar = useCallback(() => {
    if (cooldownRef.current - (Date.now() - emoteAtRef.current) > 0) return;
    emoteAtRef.current = Date.now();
    setEmoteLeft(cooldownRef.current);
    clientRef.current?.emote();
  }, []);

  useEffect(() => {
    if (emoteLeft <= 0) return;
    const timer = window.setInterval(() => {
      const left = cooldownRef.current - (Date.now() - emoteAtRef.current);
      setEmoteLeft(left > 0 ? left : 0);
    }, 500);
    return () => window.clearInterval(timer);
  }, [emoteLeft]);

  /* ---------- dibujo ---------- */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Las dos capas se pintan una sola vez y despues solo se copian.
    if (!skyRef.current) {
      const sky = document.createElement("canvas");
      sky.width = SKY.w;
      sky.height = SKY.h;
      const sctx = sky.getContext("2d");
      if (sctx) drawSky(sctx);
      skyRef.current = sky;
    }
    if (!groundRef.current) {
      const ground = document.createElement("canvas");
      ground.width = WORLD.w;
      ground.height = WORLD.h;
      const gctx = ground.getContext("2d");
      if (gctx) drawGround(gctx);
      groundRef.current = ground;
    }

    let raf = 0;
    let last = performance.now();
    const t0 = performance.now();

    // Sombra de los personajes, pintada una vez: con decenas en pantalla, un
    // arco por persona y por cuadro se nota en un celular viejo.
    const sombra = document.createElement("canvas");
    sombra.width = 24;
    sombra.height = 10;
    const sctx2 = sombra.getContext("2d");
    if (sctx2) {
      sctx2.fillStyle = "rgba(0,0,0,0.3)";
      sctx2.beginPath();
      sctx2.ellipse(12, 5, 11, 4, 0, 0, Math.PI * 2);
      sctx2.fill();
    }
    /** Ancho del nombre de cada quien: medir texto en cada cuadro es caro. */
    const anchos = new Map<string, number>();

    let dpr = 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      // Techo de pixeles reales: en un celular gama baja, un canvas de 3
      // millones de pixeles arrastra el cuadro aunque el dibujo sea simple.
      const ideal = Math.min(2, window.devicePixelRatio || 1);
      const maxPx = 1_400_000;
      const sobra = (rect.width * rect.height * ideal * ideal) / maxPx;
      dpr = sobra > 1 ? Math.max(1, ideal / Math.sqrt(sobra)) : ideal;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // 1. Mover
      const k = keysRef.current;
      const mine = meRef.current;
      let dx = (k.right ? 1 : 0) - (k.left ? 1 : 0);
      let dy = (k.down ? 1 : 0) - (k.up ? 1 : 0);
      if (dx && dy) {
        dx *= 0.7071;
        dy *= 0.7071;
      }
      const moving = dx !== 0 || dy !== 0;
      if (moving) {
        mine.x = Math.max(FLOOR.left, Math.min(FLOOR.right, mine.x + dx * SPEED * dt));
        mine.y = Math.max(FLOOR.top, Math.min(FLOOR.bottom, mine.y + dy * SPEED * dt));
        if (Math.abs(dx) > Math.abs(dy)) mine.d = dx > 0 ? 3 : 1;
        else mine.d = dy > 0 ? 0 : 2;
        mine.step += dt * 7;
        clientRef.current?.move(mine.x, mine.y, mine.d, true);
      } else if (mine.w) {
        clientRef.current?.move(mine.x, mine.y, mine.d, false);
      }
      mine.w = moving;

      // 2. Camara: solo horizontal, asi el suelo entero cabe siempre y el
      //    Misti nunca se va de pantalla, que es la gracia.
      const viewW = canvas.width / dpr;
      const viewH = canvas.height / dpr;
      const skyH = Math.round(viewH * 0.36);
      const groundTopW = GROUND_TOP * P;
      const scale = (viewH - skyH) / (WORLD.h - groundTopW);
      const visibleW = viewW / scale;
      const camX =
        visibleW >= WORLD.w
          ? WORLD.w / 2
          : Math.max(visibleW / 2, Math.min(WORLD.w - visibleW / 2, mine.x));

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, viewW, viewH);

      // 2a. Cielo, pegado arriba y desplazandose mas despacio que el suelo.
      const sky = skyRef.current;
      if (sky) {
        const skyW = Math.max(viewW * 1.1, (skyH / SKY.h) * SKY.w);
        const sobra = Math.max(0, skyW - viewW);
        const avance = WORLD.w > visibleW ? (camX - visibleW / 2) / (WORLD.w - visibleW) : 0.5;
        const offset = -sobra * Math.min(1, Math.max(0, avance));
        ctx.drawImage(sky, offset, 0, skyW, skyH);

        // 2b. El avion del cartel, cada tanto.
        const ciclo = (now - t0) % AVION_CADA_MS;
        if (ciclo < AVION_DURA_MS) {
          const t = ciclo / AVION_DURA_MS;
          const ancho = SKY.w / P;
          ctx.save();
          ctx.translate(offset, 0);
          ctx.scale(skyW / SKY.w, skyH / SKY.h);
          // Entra por la izquierda con el cartel detras, asi que arranca bien
          // afuera para que el cartel no aparezca de la nada.
          drawPlane(ctx, Math.round(-40 + t * (ancho + 200)), 30, now / 220);
          ctx.restore();
        }
      }

      ctx.save();
      ctx.translate(viewW / 2 - camX * scale, skyH - groundTopW * scale);
      ctx.scale(scale, scale);

      // Solo el pedazo de plaza que se ve: copiar los 1800 px de ancho en cada
      // cuadro es justo lo que hace sufrir a un celular gama baja.
      const ground = groundRef.current;
      const desde = Math.max(0, Math.floor(camX - visibleW / 2) - 8);
      const hasta = Math.min(WORLD.w, Math.ceil(camX + visibleW / 2) + 8);
      // Arranca un poco mas arriba del borde del suelo: las palmeras de la
      // primera fila asoman sobre la vereda y si no, se ven decapitadas.
      const alto = Math.max(0, groundTopW - 90);
      if (ground) {
        ctx.drawImage(
          ground,
          desde,
          alto,
          hasta - desde,
          WORLD.h - alto,
          desde,
          alto,
          hasta - desde,
          WORLD.h - alto,
        );
      }

      // 3. Gente, de atras hacia adelante para que se tapen bien
      const client = clientRef.current;
      const todos: (LobbyPlayer & { mine?: boolean })[] = client ? [...client.players.values()] : [];
      todos.push({
        id: me?.player.id ?? 0,
        name: me?.player.name ?? "",
        skin: me?.player.skin ?? null,
        x: mine.x,
        y: mine.y,
        d: mine.d,
        w: mine.w,
        emote: false,
        emoteAt: emoteAtRef.current,
        mine: true,
      });
      todos.sort((a, b) => a.y - b.y);

      const nowMs = Date.now();
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.textAlign = "center";
      for (const p of todos) {
        // Quien quedo fuera de pantalla no se dibuja.
        if (p.x < desde - 40 || p.x > hasta + 40) continue;

        const frameIndex = p.w ? Math.floor((p.mine ? mine.step : nowMs / 160) % 2) : 0;
        ctx.drawImage(sombra, Math.round(p.x) - 12, Math.round(p.y) - 5);

        drawSkin(ctx, skinOf(p.skin), p.x, p.y, p.d, frameIndex);

        if (p.name) {
          let w = anchos.get(p.name);
          if (w === undefined) {
            w = ctx.measureText(p.name).width;
            anchos.set(p.name, w);
          }
          ctx.fillStyle = p.mine ? "#4285f4" : "rgba(10,10,20,0.75)";
          ctx.fillRect(p.x - w / 2 - 3, p.y - 54, w + 6, 13);
          ctx.fillStyle = "#ffffff";
          ctx.fillText(p.name, p.x, p.y - 44);
        }

        if (nowMs - p.emoteAt < 2000) {
          ctx.fillStyle = "#fbbc04";
          ctx.strokeStyle = "#191919";
          ctx.lineWidth = 2;
          ctx.fillRect(p.x - 23, p.y - 74, 46, 16);
          ctx.strokeRect(p.x - 23, p.y - 74, 46, 16);
          ctx.fillStyle = "#191919";
          ctx.fillText("¡Hola!", p.x, p.y - 62);
        }
      }

      ctx.restore();
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [me]);

  /* ---------- controles en pantalla ---------- */

  const hold = (dir: keyof Keys) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      keysRef.current[dir] = true;
    },
    onPointerUp: () => {
      keysRef.current[dir] = false;
    },
    onPointerLeave: () => {
      keysRef.current[dir] = false;
    },
    onPointerCancel: () => {
      keysRef.current[dir] = false;
    },
  });

  const segundos = Math.ceil(emoteLeft / 1000);

  return (
    <div className="relative h-[calc(100dvh-74px)] w-full overflow-hidden bg-[#0a1030]">
      <canvas ref={canvasRef} className="h-full w-full touch-none" />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
        <span className="pill bg-card">{me?.event?.name ?? "Sin evento abierto"}</span>
        <span className="flex gap-2">
          <span className="pill bg-card">
            <Icon name="users" size={16} /> {total}
          </span>
          <button
            type="button"
            className="dpad pointer-events-auto h-10 w-10"
            onClick={toggleMusica}
            aria-label={musicaOn ? "Quitar la musica" : "Poner la musica"}
            title={musicaOn ? "Quitar la musica" : "Poner la musica"}
          >
            <Icon name={musicaOn ? "music" : "muted"} size={20} />
          </button>
        </span>
      </div>

      {!ready && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-ink/80">
          <p className="text-xl font-black text-white">Entrando a la plaza...</p>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-ink/90 px-6">
          <div className="card p-5 text-center">
            <p className="text-[17px] font-bold">{error}</p>
            <button type="button" className="btn btn-blue mt-4 w-full" onClick={() => location.reload()}>
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Cruceta: en celular se toca, en PC estan las flechas igual */}
      <div className="absolute bottom-4 left-4 grid select-none grid-cols-3 grid-rows-3 gap-1.5">
        <span />
        <button type="button" aria-label="Arriba" className="dpad" {...hold("up")}>
          <Icon name="back" size={24} className="rotate-90" />
        </button>
        <span />
        <button type="button" aria-label="Izquierda" className="dpad" {...hold("left")}>
          <Icon name="back" size={24} />
        </button>
        <span />
        <button type="button" aria-label="Derecha" className="dpad" {...hold("right")}>
          <Icon name="back" size={24} className="rotate-180" />
        </button>
        <span />
        <button type="button" aria-label="Abajo" className="dpad" {...hold("down")}>
          <Icon name="back" size={24} className="-rotate-90" />
        </button>
        <span />
      </div>

      <div className="absolute bottom-4 right-4">
        <button
          type="button"
          className="btn btn-yellow flex-col gap-0 px-6 py-4"
          onClick={saludar}
          disabled={segundos > 0}
        >
          <Icon name="hand" size={26} />
          <span className="text-[13px] font-black">{segundos > 0 ? `${segundos}s` : "Saludar"}</span>
        </button>
      </div>
    </div>
  );
}
