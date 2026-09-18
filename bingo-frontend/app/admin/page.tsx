"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { admin, errorMessage, type AdminEventRow, type LiveEvent } from "@/lib/api";
import { useRealtime } from "@/lib/realtime";
import { HOUSES } from "@/lib/sprites";
import { Card, ConfirmButton, TextInput } from "@/components/admin/Form";
import { PixelIcon } from "@/components/pixel/Sprite";
import { ErrorBox, Loading, Pill } from "@/components/ui/Blocks";
import { useToast } from "@/components/ui/Toasts";

const STATUS: Record<AdminEventRow["status"], { label: string; color: string }> = {
  DRAFT: { label: "SIN ABRIR", color: "#6e7385" },
  LIVE: { label: "ABIERTO", color: "#34a853" },
  CLOSED: { label: "CERRADO", color: "#2657b8" },
};

function LiveCard({ live, onClose, busy }: { live: LiveEvent; onClose: () => void; busy: boolean }) {
  return (
    <Card color="#1c3a26">
      <p className="font-pixel flex items-center gap-2 text-[9px] text-ggreen">
        <span className="px-blink block h-2 w-2 bg-ggreen" /> EVENTO ABIERTO
      </p>
      <h1 className="font-pixel mt-2 text-[16px] leading-snug text-cream">{live.name}</h1>

      <div className="mt-3 grid grid-cols-2 gap-1">
        <div className="px-inset p-3 text-center">
          <p className="font-pixel text-[20px] text-gold">{live.players}</p>
          <p className="font-pixel mt-1 text-[8px] text-muted">JUGADORES</p>
        </div>
        <div className="px-inset p-3 text-center">
          <p className="font-pixel text-[20px] text-violet">{live.connected}</p>
          <p className="font-pixel mt-1 text-[8px] text-muted">CONECTADOS AHORA</p>
        </div>
      </div>

      <div className="mt-1 grid grid-cols-4 gap-1">
        {live.houses.map((h) => (
          <div key={h.house} className="px-inset p-2 text-center">
            <p className="font-pixel text-[7px]" style={{ color: HOUSES[h.house].P }}>
              {HOUSES[h.house].name.toUpperCase()}
            </p>
            <p className="font-pixel mt-1 text-[14px] text-cream">{h.players}</p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[15px] text-muted">
        Quien se registre o entre con su cuenta ahora queda inscrito en este evento.
      </p>
      <div className="mt-3 flex flex-wrap gap-1">
        <Link href="/admin/bingo" className="px-btn px-btn-yellow">
          <PixelIcon name="grid" size={14} /> Iniciar el bingo
        </Link>
        <ConfirmButton confirmLabel="Cerrar y dar trofeos?" disabled={busy} onConfirm={onClose}>
          Cerrar evento
        </ConfirmButton>
      </div>
    </Card>
  );
}

export default function AdminEventPage() {
  const toast = useToast();
  const [data, setData] = useState<{ events: AdminEventRow[]; live: LiveEvent | null } | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    admin
      .events()
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 20_000);
    return () => window.clearInterval(id);
  }, [load]);
  useRealtime("event:update", load);

  async function run(action: () => Promise<unknown>, ok: string, detail?: string) {
    setBusy(true);
    try {
      await action();
      toast.success(ok, detail);
      load();
    } catch (e) {
      toast.error("No se pudo", errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!data) return <Loading />;

  const others = data.events.filter((e) => e.id !== data.live?.id);

  return (
    <>
      {data.live ? (
        <LiveCard
          live={data.live}
          busy={busy}
          onClose={() => run(() => admin.closeEvent(data.live!.id), "Evento cerrado", "Trofeos entregados")}
        />
      ) : (
        <Card>
          <p className="font-pixel text-[11px] text-cream">No hay ningun evento abierto</p>
          <p className="mt-2 text-[16px] text-muted">
            Crea el evento y abrelo cuando empiece. Desde ese momento, quien se registre queda inscrito en el.
          </p>
        </Card>
      )}

      <Card title="CREAR EVENTO">
        <form
          className="flex items-center"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => admin.createEvent(name.trim()), "Evento creado", "Abrelo cuando empiece");
            setName("");
          }}
        >
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="DevFest Arequipa 2026"
            aria-label="Nombre del evento"
          />
          <button type="submit" className="px-btn px-btn-green" disabled={busy || name.trim().length < 3}>
            Crear
          </button>
        </form>
      </Card>

      {others.length > 0 && (
        <Card title="OTROS EVENTOS">
          <ul className="flex flex-col gap-1">
            {others.map((ev) => (
              <li key={ev.id} className="px-inset flex flex-wrap items-center gap-2 p-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[17px] text-cream">{ev.name}</span>
                  <span className="text-[14px] text-muted">{ev.players} jugadores</span>
                </span>
                <Pill color={STATUS[ev.status].color}>{STATUS[ev.status].label}</Pill>
                {ev.status === "DRAFT" && (
                  <ConfirmButton
                    className="px-btn-green"
                    confirmLabel={data.live ? "Cierra el abierto" : "Abrir ahora?"}
                    disabled={busy || Boolean(data.live)}
                    onConfirm={() => run(() => admin.openEvent(ev.id), "Evento abierto")}
                  >
                    Abrir
                  </ConfirmButton>
                )}
                {ev.status === "DRAFT" && ev.players === 0 && (
                  <ConfirmButton
                    className="px-btn-dark"
                    confirmLabel="Borrar?"
                    disabled={busy}
                    onConfirm={() => run(() => admin.deleteEvent(ev.id), "Evento borrado")}
                  >
                    <PixelIcon name="trash" size={12} />
                  </ConfirmButton>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
