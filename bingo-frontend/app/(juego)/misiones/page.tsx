"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage, me as meApi } from "@/lib/api";
import { useRealtime } from "@/lib/realtime";
import type { MissionCard } from "@/lib/types";
import { QrCode } from "@/components/QrCode";
import { Icon, type IconName } from "@/components/ui/Icon";
import { ErrorBox, Loading, PageTitle, ProgressBar } from "@/components/ui/Blocks";

const ICONS: Record<string, IconName> = {
  heart: "heart",
  chat: "chat",
  users: "users",
  camera: "camera",
};

/**
 * La tarjeta del participante.
 *
 * Nadie marca sus propias misiones: cumple la mision, se acerca a un
 * organizador y le muestra este QR. El QR lleva su codigo de 6 letras, que es
 * el mismo que se dicta para firmar casillas.
 */
export default function MisionesPage() {
  const [card, setCard] = useState<MissionCard | null>(null);
  const [error, setError] = useState("");

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

  return (
    <div className="flex flex-col gap-3">
      <PageTitle
        title="Tu tarjeta"
        subtitle={`${card.done} de ${card.total} completadas`}
        right={
          <span
            className="pill"
            style={{ background: card.completa ? "#34a853" : "#fbbc04", color: card.completa ? "#fff" : undefined }}
          >
            {card.done}/{card.total}
          </span>
        }
      />

      <ProgressBar value={card.done} max={card.total} />

      {/* El QR primero: es lo que el participante tiene que mostrar. */}
      <div className="card flex flex-col items-center gap-2 p-4">
        <p className="text-center text-[15px] font-semibold">
          Cumpliste una mision? Muestrale esto a un organizador.
        </p>
        <QrCode value={card.code} size={176} />
        <p className="text-[26px] font-black tracking-[0.25em]">{card.code}</p>
        <p className="text-center text-[13px] text-muted">
          Si no les abre la camara, dictales estas 6 letras.
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {card.missions.map((m) => (
          <li
            key={m.id}
            className="card-flat flex items-start gap-3 p-3"
            style={m.done ? { background: "#eaf7ec", borderColor: "#34a853" } : undefined}
          >
            <span
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-ink"
              style={{ background: m.done ? "#34a853" : "#fff", color: m.done ? "#fff" : undefined }}
            >
              <Icon name={m.done ? "check" : (ICONS[m.icon] ?? "star")} size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-extrabold leading-tight">{m.title}</p>
              <p className="text-[14px] leading-tight text-muted">{m.detail}</p>
              {!m.done && <p className="mt-1 text-[13px] leading-tight text-gblue">{m.hint}</p>}
            </div>
            <span className="pill shrink-0 text-[11px]">+{m.points}</span>
          </li>
        ))}
      </ul>

      <div
        className="card p-4 text-center"
        style={card.completa ? { background: "#34a853", color: "#fff" } : undefined}
      >
        {card.completa ? (
          <>
            <p className="text-xl font-black">Tarjeta completa</p>
            <p className="mt-1 text-[15px]">
              Ganaste +{card.bonus} puntos extra. Reclama tu premio al final del evento.
            </p>
          </>
        ) : (
          <p className="text-[15px]">
            Completa las {card.total} y ganas <b>+{card.bonus} puntos</b> y entras al premio del final.
          </p>
        )}
      </div>
    </div>
  );
}
