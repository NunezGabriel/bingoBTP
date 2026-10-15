"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { errorMessage, me as meApi } from "@/lib/api";
import { useSession } from "@/lib/session";
import { isMuted, setMuted, sfx } from "@/lib/sfx";
import type { HistoryEvent } from "@/lib/types";
import { PlayerCode } from "@/components/PlayerCode";
import { Icon } from "@/components/ui/Icon";
import { Loading, PageTitle, Pill } from "@/components/ui/Blocks";
import { useToast } from "@/components/ui/Toasts";

function day(date: string | null) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" });
}

export default function AccountPage() {
  const router = useRouter();
  const toast = useToast();
  const { me, logout } = useSession();
  const [events, setEvents] = useState<HistoryEvent[] | null>(null);
  const [pins, setPins] = useState({ current: "", next: "" });
  const [muted, setMutedState] = useState(() => isMuted());
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    meApi
      .history()
      .then((h) => setEvents(h.events))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!me) return null;

  async function changePin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await meApi.clave(pins.current, pins.next);
      setPins({ current: "", next: "" });
      toast.ok("Clave actualizada");
    } catch (err) {
      toast.error("No se cambio la clave", errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <PageTitle title="Mi cuenta" subtitle={me.player.name} />

      <PlayerCode code={me.player.code} hint="Con este codigo te firman las casillas." />

      <section className="card p-4">
        <h2 className="font-extrabold">Mis eventos</h2>
        {!events ? (
          <Loading />
        ) : events.length === 0 ? (
          <p className="mt-2 text-[15px] text-muted">
            Aun no jugaste en ningun evento. Al abrir la app durante un evento entras solo.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {events.map((ev) => (
              <li key={ev.id} className="card-flat flex items-center gap-3 p-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{ev.name}</span>
                  <span className="text-[13px] text-muted">{day(ev.joinedAt)}</span>
                </span>
                <span className="text-right">
                  {ev.status === "LIVE" ? (
                    <Pill color="#34a853" text="#fff">En curso</Pill>
                  ) : ev.finalRank ? (
                    <span className="block font-extrabold">#{ev.finalRank}</span>
                  ) : null}
                  <span className="mt-1 block text-[13px] font-bold text-muted">{ev.points} pts</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={changePin} className="card p-4">
        <h2 className="font-extrabold">Cambiar PIN</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <input
            className="input"
            type="password"
            inputMode="numeric"
            placeholder="PIN actual"
            aria-label="PIN actual"
            autoComplete="current-password"
            value={pins.current}
            onChange={(e) => setPins({ ...pins, current: e.target.value.replace(/\D/g, "").slice(0, 8) })}
          />
          <input
            className="input"
            type="password"
            inputMode="numeric"
            placeholder="PIN nuevo"
            aria-label="PIN nuevo"
            autoComplete="new-password"
            value={pins.next}
            onChange={(e) => setPins({ ...pins, next: e.target.value.replace(/\D/g, "").slice(0, 8) })}
          />
        </div>
        <button type="submit" className="btn btn-sm mt-3" disabled={busy || pins.current.length < 4 || pins.next.length < 4}>
          Cambiar PIN
        </button>
      </form>

      <button
        type="button"
        className="btn"
        onClick={() => {
          setMuted(!muted);
          setMutedState(!muted);
          if (muted) sfx.tap();
        }}
      >
        Sonido: {muted ? "no" : "si"}
      </button>

      <Link href="/admin" className="btn btn-sm">
        <Icon name="lock" size={14} /> Panel admin
      </Link>

      <button
        type="button"
        className="btn btn-red"
        onClick={async () => {
          await logout();
          router.replace("/");
        }}
      >
        <Icon name="logout" size={16} /> Cerrar sesion
      </button>
      <p className="pb-2 text-center text-[13px] text-muted">
        Para volver solo necesitas tu nombre ({me.player.name}) y tu PIN.
      </p>
    </div>
  );
}
