"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/session";
import { LobbyClient, type LobbyPlayer } from "@/lib/lobby";
import { drawGround, drawSky, FLOOR, SKY } from "@/lib/scene";
import { drawSkin, skinOf } from "@/lib/sprites";
import { Icon } from "@/components/ui/Icon";

/**
 * El lobby: la Plaza de Armas donde se espera entre rondas.
 *
 * Todo el movimiento vive en refs y se dibuja con requestAnimationFrame. Si la
 * posicion estuviera en el estado de React, cada paso volveria a renderizar la
 * pantalla entera: con 60 personajes en el canvas eso es inusable en celular.
 */

const SPEED = 130; // pixeles por segundo
const WORLD = { w: 960, h: 540 };

type Keys = { up: boolean; down: boolean; left: boolean; right: boolean };

export default function LobbyPage() {
  const { me } = useSession();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clientRef = useRef<LobbyClient | null>(null);
  const meRef = useRef({ x: WORLD.w / 2, y: WORLD.h * 0.72, d: 0, w: false, step: 0 });
  const keysRef = useRef<Keys>({ up: false, down: false, left: false, right: false });
  const skyRef = useRef<HTMLCanvasElement | null>(null);
  const groundRef = useRef<HTMLCanvasElement | null>(null);
  const cooldownRef = useRef(30000);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(1);
  const [emoteLeft, setEmoteLeft] = useState(0);

  /* ---------- conexion ---------- */

  useEffect(() => {
    const client = new LobbyClient({
      onReady: (you, world, cooldown) => {
        meRef.current = { x: you.x, y: you.y, d: you.d, w: false, step: 0 };
        cooldownRef.current = cooldown;
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
    const left = cooldownRef.current - (Date.now() - emoteAtRef.current);
    if (left > 0) return;
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
      if (gctx) drawGround(gctx, WORLD.w, WORLD.h);
      groundRef.current = ground;
    }

    let raf = 0;
    let last = performance.now();
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
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

      // 2. Camara. Solo se mueve en horizontal: asi el suelo entero cabe
      //    siempre y el Misti nunca se va de pantalla, que es la gracia.
      const viewW = canvas.width / dpr;
      const viewH = canvas.height / dpr;
      const skyH = Math.round(viewH * 0.36);
      const groundTop = FLOOR.top - 46;
      const scale = (viewH - skyH) / (WORLD.h - groundTop);
      const visibleW = viewW / scale;
      const camX =
        visibleW >= WORLD.w
          ? WORLD.w / 2
          : Math.max(visibleW / 2, Math.min(WORLD.w - visibleW / 2, mine.x));

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, viewW, viewH);

      // 2a. Cielo: pegado arriba, desplazandose mas despacio que el suelo.
      const sky = skyRef.current;
      if (sky) {
        const skyW = Math.max(viewW * 1.08, (skyH / SKY.h) * SKY.w);
        const sobra = Math.max(0, skyW - viewW);
        const avance = WORLD.w > visibleW ? (camX - visibleW / 2) / (WORLD.w - visibleW) : 0.5;
        ctx.drawImage(sky, -sobra * Math.min(1, Math.max(0, avance)), 0, skyW, skyH);
      }

      ctx.save();
      // El suelo arranca justo donde termina el cielo.
      ctx.translate(viewW / 2 - camX * scale, skyH - groundTop * scale);
      ctx.scale(scale, scale);

      if (groundRef.current) ctx.drawImage(groundRef.current, 0, 0);

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
      for (const p of todos) {
        const frameIndex = p.w ? Math.floor((p.mine ? mine.step : nowMs / 160) % 2) : 0;
        // Sombrita, para que no parezca que flotan
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 13, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        drawSkin(ctx, skinOf(p.skin), p.x, p.y, p.d, frameIndex);

        if (p.name) {
          ctx.font = "bold 11px system-ui, sans-serif";
          ctx.textAlign = "center";
          const w = ctx.measureText(p.name).width;
          ctx.fillStyle = p.mine ? "#4285f4" : "rgba(25,25,25,0.78)";
          ctx.fillRect(p.x - w / 2 - 4, p.y - 66, w + 8, 14);
          ctx.fillStyle = "#ffffff";
          ctx.fillText(p.name, p.x, p.y - 55);
        }

        // El saludo dura dos segundos sobre la cabeza
        if (nowMs - p.emoteAt < 2000) {
          ctx.font = "bold 12px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillStyle = "#fbbc04";
          ctx.strokeStyle = "#191919";
          ctx.lineWidth = 2;
          const bw = 52;
          ctx.fillRect(p.x - bw / 2, p.y - 88, bw, 18);
          ctx.strokeRect(p.x - bw / 2, p.y - 88, bw, 18);
          ctx.fillStyle = "#191919";
          ctx.fillText("¡Hola!", p.x, p.y - 75);
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
    <div className="relative h-[calc(100dvh-62px)] w-full overflow-hidden bg-[#9ed2f0]">
      <canvas ref={canvasRef} className="h-full w-full touch-none" />

      {/* Arriba: evento y cuanta gente hay */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
        <span className="pill bg-card text-[12px]">
          {me?.event?.name ?? "Sin evento abierto"}
        </span>
        <span className="pill bg-card text-[12px]">
          <Icon name="users" size={14} /> {total}
        </span>
      </div>

      {!ready && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-paper/80">
          <p className="font-extrabold">Entrando a la plaza...</p>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-paper/90 px-6">
          <div className="card p-4 text-center">
            <p className="font-bold">{error}</p>
            <button type="button" className="btn btn-blue mt-3" onClick={() => location.reload()}>
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Cruceta: en celular se toca, en PC estan las flechas igual */}
      <div className="absolute bottom-3 left-3 grid grid-cols-3 grid-rows-3 gap-1.5 select-none">
        <span />
        <button type="button" aria-label="Arriba" className="dpad" {...hold("up")}>
          <Icon name="back" size={20} className="rotate-90" />
        </button>
        <span />
        <button type="button" aria-label="Izquierda" className="dpad" {...hold("left")}>
          <Icon name="back" size={20} />
        </button>
        <span />
        <button type="button" aria-label="Derecha" className="dpad" {...hold("right")}>
          <Icon name="back" size={20} className="rotate-180" />
        </button>
        <span />
        <button type="button" aria-label="Abajo" className="dpad" {...hold("down")}>
          <Icon name="back" size={20} className="-rotate-90" />
        </button>
        <span />
      </div>

      {/* Saludar */}
      <div className="absolute bottom-3 right-3">
        <button
          type="button"
          className="btn btn-yellow flex-col gap-0 px-5 py-3"
          onClick={saludar}
          disabled={segundos > 0}
        >
          <Icon name="hand" size={22} />
          <span className="text-[12px] font-extrabold">
            {segundos > 0 ? `${segundos}s` : "Saludar"}
          </span>
        </button>
      </div>
    </div>
  );
}
