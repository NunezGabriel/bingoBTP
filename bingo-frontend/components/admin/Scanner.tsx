"use client";

import jsQR from "jsqr";
import { useCallback, useEffect, useRef, useState } from "react";
import { admin, cleanCode, errorMessage } from "@/lib/api";
import { sfx } from "@/lib/sfx";
import type { Mission, MissionCard, Player } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toasts";

type Resultado = { player: Player; card: MissionCard; mission: string };

/**
 * El escaner de misiones.
 *
 * Primero se elige QUE mision se esta validando y despues se escanea a la
 * gente en fila: asi el organizador no tiene que tocar la pantalla entre
 * persona y persona. Si la camara no se puede abrir (pasa siempre por HTTP,
 * porque el navegador la bloquea sin HTTPS) queda el codigo de 6 letras, que
 * hace exactamente lo mismo.
 */
export function Scanner({ onChanged }: { onChanged: () => void }) {
  const toast = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastRef = useRef({ code: "", at: 0 });

  const [missions, setMissions] = useState<Omit<Mission, "done" | "doneAt">[]>([]);
  const [missionId, setMissionId] = useState<string>("");
  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState("");
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  const [ultimo, setUltimo] = useState<Resultado | null>(null);

  useEffect(() => {
    admin
      .missions()
      .then((r) => {
        setMissions(r.missions);
        setMissionId((prev) => prev || r.missions[0]?.id || "");
      })
      .catch((e) => toast.error("No se cargaron las misiones", errorMessage(e)));
  }, [toast]);

  const validar = useCallback(
    async (code: string) => {
      const limpio = cleanCode(code);
      if (!limpio || !missionId || busy) return;
      setBusy(true);
      try {
        const r = await admin.validateMission(limpio, missionId);
        sfx.ok();
        setUltimo(r);
        toast.ok(`${r.player.name}: validada`, `${r.card.done} de ${r.card.total}`);
        onChanged();
      } catch (e) {
        sfx.error();
        toast.error("No se valido", errorMessage(e));
      } finally {
        setBusy(false);
        setManual("");
      }
    },
    [missionId, busy, toast, onChanged],
  );

  /* ---------- camara ---------- */

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  async function start() {
    setCamError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError(
        "Este navegador no da acceso a la camara. Si la app se abrio por http://, usa la direccion https y vuelve a intentar.",
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
    } catch (e) {
      setCamError(
        `No se pudo abrir la camara (${errorMessage(e)}). Escribe el codigo de 6 letras y listo.`,
      );
    }
  }

  // Lee un cuadro cada 250 ms: mas seguido no lee mejor y calienta el telefono.
  useEffect(() => {
    if (!scanning) return;
    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvasRef.current = canvas;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const id = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || !ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;
      const w = 320;
      const h = Math.round((video.videoHeight / video.videoWidth) * w) || 240;
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(video, 0, 0, w, h);
      const image = ctx.getImageData(0, 0, w, h);
      const found = jsQR(image.data, w, h, { inversionAttempts: "dontInvert" });
      if (!found?.data) return;

      const code = cleanCode(found.data.split("/").pop() ?? "");
      const now = Date.now();
      // El mismo QR delante de la camara dispara muchas lecturas por segundo.
      if (!code || (lastRef.current.code === code && now - lastRef.current.at < 4000)) return;
      lastRef.current = { code, at: now };
      void validar(code);
    }, 250);

    return () => window.clearInterval(id);
  }, [scanning, validar]);

  const activa = missions.find((m) => m.id === missionId);

  return (
    <div className="flex flex-col gap-3">
      <section className="card p-4">
        <h2 className="font-extrabold">1. Que mision estas validando</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {missions.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => setMissionId(m.id)}
                aria-pressed={m.id === missionId}
                className={`flex w-full items-center gap-2 rounded-[16px] border-2 border-ink p-2.5 text-left ${
                  m.id === missionId ? "bg-ink text-white" : "bg-card"
                }`}
              >
                <Icon name={m.id === missionId ? "check" : "star"} size={16} />
                <span className="min-w-0 flex-1 truncate text-[15px] font-bold">{m.title}</span>
                <span className="shrink-0 text-[12px] font-extrabold">+{m.points}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-4">
        <h2 className="font-extrabold">2. Escanea su QR</h2>
        <p className="mt-1 text-[14px] text-muted">
          Validando: <b>{activa?.title ?? "elige una mision"}</b>
        </p>

        <div className="mt-3 overflow-hidden rounded-[18px] border-2 border-ink bg-ink">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`aspect-square w-full object-cover ${scanning ? "" : "hidden"}`}
          />
          {!scanning && (
            <div className="flex aspect-square w-full items-center justify-center">
              <button type="button" className="btn btn-yellow" onClick={start} disabled={!missionId}>
                <Icon name="qr" size={18} /> Abrir camara
              </button>
            </div>
          )}
        </div>

        {scanning && (
          <button type="button" className="btn mt-2 w-full" onClick={stop}>
            Apagar camara
          </button>
        )}
        {camError && <p className="mt-2 text-[14px] font-semibold text-gred">{camError}</p>}

        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void validar(manual);
          }}
        >
          <input
            className="input input-code"
            value={manual}
            onChange={(e) => setManual(cleanCode(e.target.value))}
            placeholder="ABC123"
            aria-label="Codigo del participante"
            autoCapitalize="characters"
            autoComplete="off"
          />
          <button type="submit" className="btn btn-green" disabled={busy || manual.length !== 6 || !missionId}>
            Validar
          </button>
        </form>
      </section>

      {ultimo && (
        <section
          className="card p-4"
          style={ultimo.card.completa ? { background: "#34a853", color: "#fff" } : undefined}
        >
          <p className="text-[13px] font-extrabold uppercase opacity-80">Ultimo validado</p>
          <p className="text-2xl font-black leading-tight">{ultimo.player.name}</p>
          <p className="mt-1 text-[15px]">
            {ultimo.card.done} de {ultimo.card.total} misiones
            {ultimo.card.completa ? " · TARJETA COMPLETA, dale su premio" : ""}
          </p>
        </section>
      )}
    </div>
  );
}
