"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage, me as meApi } from "@/lib/api";
import { useRealtime } from "@/lib/realtime";
import type { MissionCard } from "@/lib/types";
import { QrCode } from "@/components/QrCode";
import { Icon, type IconName } from "@/components/ui/Icon";
import { ErrorBox, Loading } from "@/components/ui/Blocks";
import { Modal } from "@/components/ui/Modal";

const ICONS: Record<string, IconName> = {
  heart: "heart",
  chat: "chat",
  users: "users",
  camera: "camera",
};

/** Un color por mision, en el orden del logo de Google. */
const COLORS = ["#4285f4", "#ea4335", "#fbbc04", "#34a853"];

/**
 * La tarjeta del participante, como una tarjeta de verdad: cuatro casillas
 * numeradas que se van marcando, y el QR grande en el centro.
 *
 * Nadie marca sus propias misiones: cumples la mision, te acercas a un
 * organizador y le muestras el QR.
 */
export default function MisionesPage() {
  const [card, setCard] = useState<MissionCard | null>(null);
  const [error, setError] = useState("");
  const [abierta, setAbierta] = useState<number | null>(null);

  const load = useCallback(() => {
    meApi
      .misiones()
      .then((data) => {
        setCard(data);
        setError("");
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);

  useEffect(() => load(), [load]);
  useRealtime("mission:done", load);
  useRealtime("resync", load);

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!card) return <Loading label="Buscando tu tarjeta" />;

  const mision = abierta === null ? null : card.missions[abierta];

  // En celular las dos tarjetas van una debajo de la otra, como siempre. En
  // monitor se ponen lado a lado: apiladas obligaban a bajar hasta el final
  // para encontrar el QR, que es justo lo que hay que mostrarle al organizador.
  // items-start evita que la del QR se estire al alto de la otra.
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 md:items-start">
      {/* La tarjeta */}
      <section
        className="card overflow-hidden p-0"
        style={{ background: card.completa ? "#34a853" : "#191919", color: "#fff" }}
      >
        <div className="flex items-center justify-between gap-2 px-5 pt-4">
          <span className="text-[13px] font-black uppercase tracking-[0.18em] opacity-80">
            Tarjeta de retos
          </span>
          <span className="pill bg-white text-ink">
            {card.done}/{card.total}
          </span>
        </div>

        <h1 className="px-5 pb-1 pt-2 text-[30px] font-black leading-none">
          {card.completa ? "Tarjeta completa" : "Completa los 4"}
        </h1>
        <p className="px-5 pb-4 text-[15px] font-semibold opacity-85">
          {card.completa
            ? "Ya estas dentro del premio grande. Reclamalo al final del evento."
            : "Hay que completar las cuatro para entrar al premio grande del final."}
        </p>

        {/* Los cuatro retos, en cuadricula */}
        <ul className="grid grid-cols-2 gap-3 px-4 pb-5">
          {card.missions.map((m, i) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => setAbierta(i)}
                className="flex h-full w-full flex-col items-center gap-2 rounded-[20px] border-[3px] border-white/25 px-2 py-4 text-center"
                style={{ background: m.done ? "#ffffff" : "rgba(255,255,255,0.08)" }}
              >
                <span
                  className="flex h-14 w-14 items-center justify-center rounded-full border-[3px]"
                  style={{
                    background: m.done ? "#34a853" : COLORS[i % COLORS.length],
                    borderColor: m.done ? "#191919" : "rgba(255,255,255,0.5)",
                    color: "#fff",
                  }}
                >
                  <Icon name={m.done ? "check" : (ICONS[m.icon] ?? "star")} size={26} />
                </span>
                <span
                  className="text-[11px] font-black uppercase tracking-widest"
                  style={{ color: m.done ? "#6b6b6b" : "rgba(255,255,255,0.65)" }}
                >
                  0{i + 1}
                </span>
                <span
                  className="text-[14px] font-extrabold leading-tight"
                  style={{ color: m.done ? "#191919" : "#fff" }}
                >
                  {m.title}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* El QR: lo que hay que mostrarle al organizador */}
      <section className="card flex flex-col items-center gap-2 p-5">
        <p className="text-center text-[17px] font-extrabold leading-tight">
          Cumpliste un reto? Muestra esto a un organizador
        </p>
        <QrCode value={card.code} size={200} />
        <p className="text-[32px] font-black leading-none tracking-[0.25em]">{card.code}</p>
        <p className="text-center text-[15px] text-muted">
          Si no les abre la camara, dictales estas 6 letras.
        </p>
        </section>
      </div>

      <Modal open={mision !== null} onClose={() => setAbierta(null)} title={`Reto 0${(abierta ?? 0) + 1}`}>
        {mision && (
          <>
            <p className="text-[22px] font-black leading-tight">{mision.title}</p>
            <p className="mt-2 text-[17px] text-muted">{mision.detail}</p>
            {mision.done ? (
              <p className="mt-4 flex items-center gap-2 text-[18px] font-extrabold text-ggreen">
                <Icon name="check" size={22} /> Ya te lo validaron
              </p>
            ) : (
              <p className="mt-4 text-[17px] font-semibold text-gblue">{mision.hint}</p>
            )}
            <button type="button" className="btn btn-lg mt-5 w-full" onClick={() => setAbierta(null)}>
              Cerrar
            </button>
          </>
        )}
      </Modal>
    </>
  );
}
