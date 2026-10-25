"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { admin, errorMessage } from "@/lib/api";
import { RealtimeProvider, useRealtime } from "@/lib/realtime";
import { useSession } from "@/lib/session";
import type { AdminEventRow, Overview, Round, RoundResults } from "@/lib/types";
import { BingoWordmark, GdgLogo } from "@/components/Brand";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { MissionsReport } from "@/components/admin/MissionsReport";
import { PlayersPanel } from "@/components/admin/PlayersPanel";
import { Scanner } from "@/components/admin/Scanner";
import { Icon, type IconName } from "@/components/ui/Icon";
import { ErrorBox, Loading, Pill } from "@/components/ui/Blocks";
import { useToast } from "@/components/ui/Toasts";

type Tab = "evento" | "ronda" | "escaner" | "jugadores";

const TABS: { key: Tab; label: string; icon: IconName }[] = [
  { key: "evento", label: "Evento", icon: "flag" },
  { key: "ronda", label: "Ronda", icon: "grid" },
  { key: "escaner", label: "Escaner", icon: "qr" },
  { key: "jugadores", label: "Jugadores", icon: "users" },
];

const PODIUM = ["#fbbc04", "#c9c9c9", "#cd7f32"];
const STATUS: Record<AdminEventRow["status"], { label: string; color: string; text?: string }> = {
  DRAFT: { label: "Sin abrir", color: "#ffffff" },
  LIVE: { label: "Abierto", color: "#34a853", text: "#fff" },
  CLOSED: { label: "Cerrado", color: "#4285f4", text: "#fff" },
};

/* ---------- Pestana: evento ---------- */

function EventTab({ overview, reload }: { overview: Overview; reload: () => void }) {
  const toast = useToast();
  const [events, setEvents] = useState<AdminEventRow[] | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const loadEvents = useCallback(() => {
    admin
      .events()
      .then((r) => setEvents(r.events))
      .catch((e) => toast.error("No se cargaron los eventos", errorMessage(e)));
  }, [toast]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  async function run(action: () => Promise<unknown>, ok: string, detail?: string) {
    setBusy(true);
    try {
      await action();
      toast.ok(ok, detail);
      loadEvents();
      reload();
    } catch (e) {
      toast.error("No se pudo", errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const live = overview.event;
  const others = (events ?? []).filter((e) => e.id !== live?.id);

  return (
    <div className="flex flex-col gap-3">
      {live ? (
        <section className="card p-5" style={{ background: "#34a853", color: "#fff" }}>
          <span className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-wide">
            <span className="blink block h-2 w-2 rounded-full bg-white" /> Evento abierto
          </span>
          <h2 className="mt-2 text-2xl font-black leading-tight">{live.name}</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="card-soft p-3 text-center text-ink">
              <p className="text-2xl font-black">{overview.players}</p>
              <p className="text-[12px] font-bold uppercase text-muted">Jugando</p>
            </div>
            <div className="card-soft p-3 text-center text-ink">
              <p className="text-2xl font-black">{overview.connected}</p>
              <p className="text-[12px] font-bold uppercase text-muted">Conectados</p>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="card-soft p-3 text-center text-ink">
              <p className="text-2xl font-black">{overview.lobby}</p>
              <p className="text-[12px] font-bold uppercase text-muted">En el lobby</p>
            </div>
            <div className="card-soft p-3 text-center text-ink">
              <p className="text-2xl font-black">{overview.missions?.completas ?? 0}</p>
              <p className="text-[12px] font-bold uppercase text-muted">Tarjetas listas</p>
            </div>
          </div>
          <p className="mt-3 text-[14px] opacity-95">
            Quien se registre o entre con su cuenta ahora queda en este evento.
          </p>
          <ConfirmButton
            className="btn-ink mt-4 w-full"
            confirmLabel="Cerrar y congelar el ranking?"
            disabled={busy}
            onConfirm={() => run(() => admin.closeEvent(live.id), "Evento cerrado")}
          >
            Cerrar evento
          </ConfirmButton>
        </section>
      ) : (
        <section className="card p-5">
          <h2 className="text-xl font-extrabold">No hay ningun evento abierto</h2>
          <p className="mt-1 text-[15px] text-muted">
            Crea el evento y abrelo cuando empiece. El bingo sirve para cualquier evento de GDG.
          </p>
        </section>
      )}

      {live && <MissionsReport />}

      <section className="card p-5">
        <h2 className="font-extrabold">Crear evento</h2>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => admin.createEvent(name.trim()), "Evento creado", "Abrelo cuando empiece");
            setName("");
          }}
        >
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="DevFest Arequipa 2026"
            aria-label="Nombre del evento"
          />
          <button type="submit" className="btn btn-green" disabled={busy || name.trim().length < 3}>
            Crear
          </button>
        </form>
      </section>

      {others.length > 0 && (
        <section className="card p-5">
          <h2 className="font-extrabold">Otros eventos</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {others.map((ev) => (
              <li key={ev.id} className="card-flat flex flex-wrap items-center gap-2 p-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{ev.name}</span>
                  <span className="text-[13px] text-muted">
                    {ev.players} jugadores · {ev.rounds} rondas
                  </span>
                </span>
                <Pill color={STATUS[ev.status].color} text={STATUS[ev.status].text}>
                  {STATUS[ev.status].label}
                </Pill>
                {ev.status === "DRAFT" && (
                  <ConfirmButton
                    className="btn-green btn-sm"
                    confirmLabel={live ? "Cierra el abierto" : "Abrir ahora?"}
                    disabled={busy || Boolean(live)}
                    onConfirm={() => run(() => admin.openEvent(ev.id), "Evento abierto")}
                  >
                    Abrir
                  </ConfirmButton>
                )}
                {ev.status === "DRAFT" && ev.players === 0 && (
                  <ConfirmButton
                    className="btn-sm"
                    confirmLabel="Borrar?"
                    disabled={busy}
                    onConfirm={() => run(() => admin.deleteEvent(ev.id), "Evento borrado")}
                  >
                    <Icon name="trash" size={14} />
                  </ConfirmButton>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ---------- Pestana: ronda ---------- */

function RoundTab({ overview, reload }: { overview: Overview; reload: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [points, setPoints] = useState({ cell: "", complete: "" });

  const round = overview.round ?? null;

  async function newRound() {
    setBusy(true);
    try {
      const r = await admin.newRound({
        cellPoints: points.cell ? Number(points.cell) : undefined,
        completePoints: points.complete ? Number(points.complete) : undefined,
      });
      toast.ok(`Ronda ${r.round.number} abierta`, `Codigo ${r.round.code}`);
      reload();
    } catch (e) {
      toast.error("No se pudo empezar", errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function endRound(id: number) {
    setBusy(true);
    try {
      const r = await admin.endRound(id);
      const winner = r.results.winners[0];
      toast.ok("Ronda terminada", winner ? `Gano ${winner.player.name}` : "Nadie completo su cartilla");
      reload();
    } catch (e) {
      toast.error("No se pudo terminar", errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (!overview.event) {
    return (
      <section className="card p-5">
        <h2 className="text-xl font-extrabold">Primero abre un evento</h2>
        <p className="mt-1 text-[15px] text-muted">Las rondas son de los jugadores del evento abierto.</p>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {round ? (
        <section className="card p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-extrabold">Ronda {round.number}</h2>
            <Pill color={round.status === "ACTIVE" ? "#34a853" : "#fbbc04"} text={round.status === "ACTIVE" ? "#fff" : undefined}>
              {round.status === "ACTIVE" ? "En curso" : "Cuenta regresiva"}
            </Pill>
          </div>

          {/* El codigo en grande: es lo que el admin proyecta en su sala y
              dicta por el microfono. Debajo, cuantos han entrado, para saber
              cuando vale la pena arrancar. */}
          <div className="card-flat mt-4 flex flex-col items-center p-4">
            <span className="text-[12px] font-black uppercase tracking-[0.25em] text-muted">
              Codigo de esta ronda
            </span>
            <span className="text-[56px] font-black leading-none tracking-[0.2em]">{round.code}</span>
            <span className="mt-1 text-[15px] font-bold text-muted">
              {round.entraron} {round.entraron === 1 ? "persona entro" : "personas entraron"}
            </span>
          </div>

          <p className="mt-4 text-4xl font-black leading-none">
            {round.progress.completed}
            <span className="text-base font-bold text-muted"> de {round.progress.cards} completaron</span>
          </p>

          {round.progress.winners.length > 0 && (
            <ol className="mt-4 flex flex-col gap-2">
              {round.progress.winners.slice(0, 5).map((w) => (
                <li key={w.player.id} className="card-flat flex items-center gap-3 p-2.5">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink text-[13px] font-black"
                    style={{ background: PODIUM[w.rank - 1] ?? "#f0f0f0" }}
                  >
                    {w.rank}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-bold">{w.player.name}</span>
                </li>
              ))}
            </ol>
          )}

          {round.progress.closest.length > 0 && (
            <>
              <p className="mt-4 text-[12px] font-extrabold uppercase text-muted">Van mas cerca</p>
              <ul className="mt-2 flex flex-col gap-1">
                {round.progress.closest.map((c) => (
                  <li key={c.player.id} className="flex items-center gap-2 text-[15px]">
                    <span className="min-w-0 flex-1 truncate font-semibold">{c.player.name}</span>
                    <span className="font-black">{c.signed}/9</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="mt-5 flex flex-col gap-2">
            <ConfirmButton
              className="btn-ink"
              confirmLabel="Terminar para todos?"
              disabled={busy}
              onConfirm={() => endRound(round.id)}
            >
              <Icon name="stop" size={16} /> Terminar ronda
            </ConfirmButton>
            <ConfirmButton
              className="btn-yellow"
              confirmLabel="Reparte cartillas nuevas?"
              disabled={busy}
              onConfirm={newRound}
            >
              <Icon name="refresh" size={16} /> Reiniciar: nueva ronda
            </ConfirmButton>
          </div>
        </section>
      ) : (
        <section className="card p-5">
          <h2 className="text-xl font-extrabold">Empezar una ronda</h2>
          <p className="mt-1 text-[15px] text-muted">
            Todos los jugadores del evento veran 5, 4, 3, 2, 1 y recibiran una cartilla nueva de 9 casillas.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <label className="text-[13px] font-extrabold uppercase text-muted">
              Puntos por firma
              <input
                className="input mt-1"
                inputMode="numeric"
                placeholder="5"
                value={points.cell}
                onChange={(e) => setPoints({ ...points, cell: e.target.value.replace(/\D/g, "") })}
              />
            </label>
            <label className="text-[13px] font-extrabold uppercase text-muted">
              Al completar
              <input
                className="input mt-1"
                inputMode="numeric"
                placeholder="50"
                value={points.complete}
                onChange={(e) => setPoints({ ...points, complete: e.target.value.replace(/\D/g, "") })}
              />
            </label>
          </div>
          <p className="mt-2 text-[13px] text-muted">
            Vacio = los valores de src/content/bingo.js. Sube los puntos en la ultima ronda para dar chance de remontar.
          </p>
          <ConfirmButton className="btn-blue btn-lg mt-4 w-full" confirmLabel="Empezar para todos?" disabled={busy} onConfirm={newRound}>
            <Icon name="play" size={18} /> Empezar ronda
          </ConfirmButton>
        </section>
      )}

      {!round && overview.lastRound && (
        <section className="card p-5">
          <h2 className="font-extrabold">Ronda {overview.lastRound.round.number} (terminada)</h2>
          {overview.lastRound.results.winners.length === 0 ? (
            <p className="mt-2 text-[15px] text-muted">Nadie completo su cartilla.</p>
          ) : (
            <ol className="mt-3 flex flex-col gap-2">
              {overview.lastRound.results.winners.slice(0, 5).map((w) => (
                <li key={w.player.id} className="card-flat flex items-center gap-3 p-2.5">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink text-[13px] font-black"
                    style={{ background: PODIUM[w.rank - 1] ?? "#f0f0f0" }}
                  >
                    {w.rank}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-bold">{w.player.name}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {overview.top && overview.top.length > 0 && (
        <section className="card p-5">
          <h2 className="font-extrabold">Top del evento</h2>
          <ol className="mt-3 flex flex-col gap-1.5">
            {overview.top.map((r) => (
              <li key={r.player.id} className="flex items-center gap-3">
                <span className="w-6 text-center font-black text-muted">{r.rank}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">{r.player.name}</span>
                <span className="font-black">{r.points}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

/* ---------- Panel ---------- */

function Panel({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("evento");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    admin
      .overview()
      .then((d) => {
        setOverview(d);
        setError("");
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 20_000);
    return () => window.clearInterval(id);
  }, [load]);

  useRealtime("round:countdown", load);
  useRealtime<Round>("round:started", (r) =>
    setOverview((o) => (o?.round && o.round.id === r.id ? { ...o, round: { ...o.round, ...r } } : o)),
  );
  useRealtime("round:ended", load);
  useRealtime("event:update", load);
  useRealtime<RoundResults & { roundId: number }>("bingo:progress", (p) =>
    setOverview((o) => (o?.round && o.round.id === p.roundId ? { ...o, round: { ...o.round, progress: p } } : o)),
  );
  useRealtime<{ top: Overview["top"] }>("leaderboard", (lb) => setOverview((o) => (o ? { ...o, top: lb.top } : o)));

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-10 pt-3">
      <header className="flex items-center justify-between gap-2">
        <GdgLogo size={18} />
        <div className="flex gap-1">
          <Link href="/pantalla" target="_blank" className="btn btn-sm">
            <Icon name="eye" size={14} /> Proyector
          </Link>
          <Link href="/pantalla/crono" target="_blank" className="btn btn-sm">
            <Icon name="clock" size={14} /> Crono
          </Link>
          <button type="button" className="btn btn-sm" onClick={onLogout}>
            <Icon name="logout" size={14} />
          </button>
        </div>
      </header>

      <nav className="mt-3 grid grid-cols-4 gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`btn btn-sm ${tab === t.key ? "btn-ink" : ""}`}
            aria-current={tab === t.key ? "page" : undefined}
            onClick={() => setTab(t.key)}
          >
            <Icon name={t.icon} size={15} /> {t.label}
          </button>
        ))}
      </nav>

      <main className="mt-4">
        {error ? (
          <ErrorBox message={error} onRetry={load} />
        ) : !overview ? (
          <Loading />
        ) : tab === "evento" ? (
          <EventTab overview={overview} reload={load} />
        ) : tab === "ronda" ? (
          <RoundTab overview={overview} reload={load} />
        ) : tab === "escaner" ? (
          <Scanner onChanged={load} />
        ) : (
          <PlayersPanel onChanged={load} />
        )}
      </main>
    </div>
  );
}

/**
 * Al panel se entra con una cuenta de rol ADMIN, por la misma puerta que
 * todos. No hay codigo suelto ni cuenta compartida: cada validacion de mision
 * queda firmada por quien la hizo.
 */
export default function AdminPage() {
  const { status, me, logout } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "guest") router.replace("/entrar?next=%2Fadmin");
  }, [status, router]);

  if (status === "loading" || status === "guest" || !me) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <Loading label="Verificando" />
      </main>
    );
  }

  if (me.player.role !== "ADMIN") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 px-5">
        <div className="self-center">
          <BingoWordmark size={34} subtitle="Panel admin" />
        </div>
        <div className="card p-5 text-center">
          <h1 className="text-xl font-extrabold">Esta cuenta no es de admin</h1>
          <p className="mt-1 text-[15px] text-muted">
            Entraste como {me.player.name}. El panel es solo para las cuentas de organizacion.
          </p>
          <Link href="/lobby" className="btn btn-blue mt-4 w-full">
            Ir al lobby
          </Link>
        </div>
      </main>
    );
  }

  return (
    <RealtimeProvider enabled>
      <Panel
        onLogout={async () => {
          await logout();
          router.replace("/entrar");
        }}
      />
    </RealtimeProvider>
  );
}
