"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pitidos, reloj } from "@/lib/crono";
import { GdgMark } from "@/components/Brand";

/** Duraciones de un toque. 45 es la de la mini hackaton. */
const PRESETS = [15, 30, 45, 60];
const POR_DEFECTO = 45;

/**
 * El cronometro del proyector.
 *
 * Esta aparte de /pantalla a proposito: esa pantalla vive del tiempo real del
 * bingo (rondas, podio, puntos) y esto no tiene nada que ver. Aqui no hay
 * sesion, ni backend, ni conexion viva: se abre, se proyecta y cuenta. Si se
 * cae la WiFi del evento, el cronometro sigue.
 *
 * La cuenta sale del reloj del sistema y no de sumar intervalos: un setInterval
 * se atrasa cuando el navegador tiene la pestana de fondo, y en 45 minutos ese
 * atraso se nota.
 *
 * Lo que manda vive en refs y el estado es solo para pintar. Asi los mandos no
 * cambian de identidad en cada cuadro: con el tiempo restante como dependencia,
 * el atajo del teclado se volvia a suscribir diez veces por segundo.
 */
export default function CronoPage() {
  const [minutos, setMinutos] = useState(POR_DEFECTO);
  const [restan, setRestan] = useState(POR_DEFECTO * 60_000);
  const [corriendo, setCorriendo] = useState(false);
  const [controles, setControles] = useState(true);

  const restanRef = useRef(POR_DEFECTO * 60_000);
  const corriendoRef = useRef(false);
  const finRef = useRef(0);
  const ultimoTicRef = useRef(-1);

  const marcar = useCallback((activo: boolean) => {
    corriendoRef.current = activo;
    setCorriendo(activo);
  }, []);

  /* ---------- la cuenta ---------- */

  useEffect(() => {
    if (!corriendo) return;
    const id = window.setInterval(() => {
      const falta = Math.max(0, finRef.current - Date.now());
      restanRef.current = falta;
      setRestan(falta);

      // Un pitido por segundo, pero solo cuando el segundo cambia de verdad.
      // El intervalo corre mas rapido que el reloj a proposito, para no
      // perderse ninguno si el navegador se retrasa un poco.
      const seg = Math.ceil(falta / 1000);
      if (seg === ultimoTicRef.current) return;
      ultimoTicRef.current = seg;
      if (seg > 0 && seg <= 10) pitidos.tic(seg);
      if (seg === 0) {
        pitidos.fin();
        marcar(false);
        setControles(true);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [corriendo, marcar]);

  /* ---------- la pantalla no se apaga mientras corre ---------- */

  useEffect(() => {
    if (!corriendo) return;
    // 45 minutos proyectando sin tocar nada: sin esto la pantalla se apaga a
    // mitad del reto. No todos los navegadores lo tienen, de ahi el opcional.
    type Candado = { release: () => Promise<void> };
    const api = (
      navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<Candado> } }
    ).wakeLock;
    let candado: Candado | null = null;
    let vivo = true;
    api
      ?.request("screen")
      .then((c) => {
        if (vivo) candado = c;
        else void c.release();
      })
      .catch(() => {});
    return () => {
      vivo = false;
      void candado?.release();
    };
  }, [corriendo]);

  /* ---------- los controles se esconden solos al proyectar ---------- */

  useEffect(() => {
    if (!corriendo) return;
    let id = window.setTimeout(() => setControles(false), 3000);
    const despertar = () => {
      setControles(true);
      window.clearTimeout(id);
      id = window.setTimeout(() => setControles(false), 3000);
    };
    window.addEventListener("mousemove", despertar);
    window.addEventListener("touchstart", despertar);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("mousemove", despertar);
      window.removeEventListener("touchstart", despertar);
    };
  }, [corriendo]);

  /* ---------- mandos ---------- */

  const arrancarOParar = useCallback(() => {
    if (corriendoRef.current) {
      marcar(false);
      setControles(true);
      return;
    }
    if (restanRef.current <= 0) return;
    // El clic es el gesto que el navegador exige para dejar sonar el audio.
    pitidos.despertar();
    finRef.current = Date.now() + restanRef.current;
    ultimoTicRef.current = -1;
    marcar(true);
  }, [marcar]);

  const fijar = useCallback(
    (m: number) => {
      const mm = Math.max(1, Math.min(180, m));
      restanRef.current = mm * 60_000;
      setMinutos(mm);
      setRestan(mm * 60_000);
      marcar(false);
      setControles(true);
    },
    [marcar],
  );

  const pantallaCompleta = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => {});
  }, []);

  // La barra espaciadora arranca y para: proyectando no se quiere andar
  // buscando un boton que ademas esta escondido.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      arrancarOParar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [arrancarOParar]);

  /* ---------- pintado ---------- */

  const segundos = Math.ceil(restan / 1000);
  const acabo = restan <= 0;
  const color = acabo || segundos <= 10 ? "#ea4335" : segundos <= 60 ? "#fbbc04" : "#ffffff";

  return (
    <main className="fixed inset-0 flex select-none flex-col bg-[#101014] text-white">
      <header className="flex items-center gap-2 p-[2vh] text-white/55">
        <GdgMark size={18} />
        <span className="text-[1.6vh] font-extrabold uppercase tracking-[0.3em]">
          Tiempo restante
        </span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
        <span
          className={`font-black leading-none tabular-nums ${acabo ? "animate-pulse" : ""}`}
          style={{ fontSize: "min(26vw, 46vh)", color }}
        >
          {reloj(restan)}
        </span>
        {acabo && (
          <span className="mt-[3vh] text-[6vh] font-black uppercase tracking-[0.2em] text-[#ea4335]">
            Tiempo
          </span>
        )}
      </div>

      <footer
        className={`flex flex-wrap items-center justify-center gap-2 p-[2vh] transition-opacity duration-500 ${
          controles ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <button type="button" className="btn btn-lg btn-blue" onClick={arrancarOParar}>
          {corriendo ? "Pausar" : acabo ? "Terminado" : "Empezar"}
        </button>
        <button type="button" className="btn btn-lg" onClick={() => fijar(minutos)}>
          Reiniciar
        </button>

        <span className="mx-2 flex gap-1">
          {PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              className={`btn btn-sm ${m === minutos ? "btn-blue" : ""}`}
              onClick={() => fijar(m)}
            >
              {m}
            </button>
          ))}
        </span>

        <span className="flex gap-1">
          <button type="button" className="btn btn-sm" onClick={() => fijar(minutos - 5)}>
            -5
          </button>
          <button type="button" className="btn btn-sm" onClick={() => fijar(minutos + 5)}>
            +5
          </button>
        </span>

        <button type="button" className="btn btn-sm" onClick={pantallaCompleta}>
          Pantalla completa
        </button>
      </footer>
    </main>
  );
}
