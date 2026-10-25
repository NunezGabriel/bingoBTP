"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { publicApi, type ScreenData } from "@/lib/api";
import { RealtimeProvider, useRealtime, useRealtimeStatus } from "@/lib/realtime";
import type { Player, Round, RoundResults } from "@/lib/types";
import { useOrigin } from "@/lib/useOrigin";
import { BingoWordmark, GdgLogo } from "@/components/Brand";
import { CountdownOverlay } from "@/components/Countdown";
import { QrCode } from "@/components/QrCode";

const PODIUM = ["#fbbc04", "#c9c9c9", "#cd7f32"];
const EMPTY: RoundResults = { cards: 0, completed: 0, winners: [], closest: [] };

function RoundLive({ round, progress }: { round: Round; progress: RoundResults }) {
  return (
    <div className="card flex min-h-0 flex-1 flex-col overflow-hidden p-[1.4vw]">
      <div className="flex items-center justify-between">
        <h2 className="text-[1.8vw] font-black">Ronda {round.number}</h2>
        <span className="pill" style={{ background: "#34a853", color: "#fff", fontSize: "1vw" }}>
          {progress.completed}/{progress.cards} completas
        </span>
      </div>

      <div className="mt-[1.5vh] grid grid-cols-3 gap-[0.8vw]">
        {[1, 2, 3].map((rank) => {
          const w = progress.winners.find((x) => x.rank === rank);
          return (
            <div
              key={rank}
              className="card-flat flex flex-col items-center justify-center p-[0.8vw] text-center"
              style={{ background: w ? PODIUM[rank - 1] : "#ffffff", minHeight: "11vh" }}
            >
              <span className="text-[2vw] font-black leading-none">{rank}</span>
              {w ? (
                <span className="mt-[0.6vh] w-full truncate text-[1.1vw] font-extrabold">{w.player.name}</span>
              ) : (
                <span className="mt-[0.6vh] text-[1vw] text-muted">libre</span>
              )}
            </div>
          );
        })}
      </div>

      {progress.closest.length > 0 && (
        <>
          <p className="mt-[1.6vh] text-[0.95vw] font-extrabold uppercase text-muted">Van mas cerca</p>
          <ul className="mt-[0.6vh] flex min-h-0 flex-col gap-[0.6vh] overflow-hidden">
            {progress.closest.slice(0, 4).map((c) => (
              <li key={c.player.id} className="flex items-center gap-[0.8vw] text-[1.3vw]">
                <span className="min-w-0 flex-1 truncate font-bold">{c.player.name}</span>
                <span className="font-black">{c.signed}/9</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-auto pt-[1vh] text-[1.1vw] text-muted">
        +{round.cellPoints} por firma · +{round.completePoints} al completar · extra {round.podiumBonus.join("/")} al podio
      </p>
    </div>
  );
}

function HowToPlay() {
  const steps = [
    "Entra desde tu celular y crea tu cartilla",
    "Busca a quien cumpla cada casilla",
    "Pidele su codigo de 6 letras y firma",
  ];
  return (
    <div className="card flex min-h-0 flex-1 flex-col justify-center p-[1.4vw]">
      <h2 className="text-[1.8vw] font-black">Como se juega</h2>
      <ol className="mt-[2vh] flex flex-col gap-[1.6vh]">
        {steps.map((step, i) => (
          <li key={step} className="flex items-center gap-[1vw]">
            <span
              className="flex h-[3.4vw] w-[3.4vw] items-center justify-center rounded-full border-2 border-ink text-[1.5vw] font-black"
              style={{ background: ["#4285f4", "#ea4335", "#34a853"][i], color: "#fff" }}
            >
              {i + 1}
            </span>
            <span className="text-[1.4vw] font-semibold leading-tight">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function WinnersOverlay({ results }: { results: RoundResults }) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-paper px-[4vw]">
      <p className="text-[3vw] font-black">Ganadores de la ronda</p>
      {results.winners.length === 0 ? (
        <p className="mt-[4vh] text-[2vw] font-semibold text-muted">Nadie completo su cartilla esta vez</p>
      ) : (
        <div className="mt-[5vh] flex items-end gap-[2vw]">
          {[2, 1, 3].map((rank) => {
            const w = results.winners.find((x) => x.rank === rank);
            if (!w) return <span key={rank} className="w-[18vw]" />;
            return (
              <div key={rank} className="flex w-[18vw] flex-col items-center text-center">
                <span className="mb-[1vh] w-full truncate text-[1.6vw] font-black">{w.player.name}</span>
                <span
                  className="card flex w-full items-center justify-center text-[4vw] font-black"
                  style={{ background: PODIUM[rank - 1], height: rank === 1 ? "22vh" : rank === 2 ? "16vh" : "12vh" }}
                >
                  {rank}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Screen() {
  const [state, setState] = useState<ScreenData | null>(null);
  const [offset, setOffset] = useState(0);
  const [countdownDone, setCountdownDone] = useState<number | null>(null);
  const [countdownSeen, setCountdownSeen] = useState<number | null>(null);
  const [winners, setWinners] = useState<RoundResults | null>(null);
  const hideWinners = useRef<number | undefined>(undefined);
  const origin = useOrigin();
  const live = useRealtimeStatus();

  const load = useCallback(() => {
    publicApi
      .screen()
      .then((s) => {
        setState({ ...s, players: s.players ?? 0, round: s.round ?? null, progress: s.progress ?? null });
        if (s.round) setOffset(s.round.serverNow - Date.now());
      })
      .catch(() => {
        /* se reintenta con el siguiente resync */
      });
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 30_000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(hideWinners.current);
    };
  }, [load]);

  const setRound = (round: Round | null, progress: RoundResults | null) => {
    if (round) setOffset(round.serverNow - Date.now());
    setState((s) => (s ? { ...s, round, progress } : s));
  };
  useRealtime<Round>("round:countdown", (r) => {
    window.clearTimeout(hideWinners.current);
    setWinners(null);
    setCountdownSeen(r.id);
    setRound(r, EMPTY);
  });
  useRealtime<Round>("round:started", (r) => setRound(r, state?.progress ?? EMPTY));
  useRealtime<RoundResults & { roundId: number }>("bingo:progress", (p) =>
    setState((s) => (s && s.round?.id === p.roundId ? { ...s, progress: p } : s)),
  );
  useRealtime<{ roundId: number; rank: number; player: Player }>("bingo:completed", (e) =>
    setState((s) => {
      if (!s || s.round?.id !== e.roundId) return s;
      const progress = s.progress ?? EMPTY;
      if (progress.winners.some((w) => w.rank === e.rank)) return s;
      const list = [...progress.winners, { rank: e.rank, player: e.player }].sort((a, b) => a.rank - b.rank);
      return { ...s, progress: { ...progress, winners: list, completed: Math.max(progress.completed, e.rank) } };
    }),
  );
  useRealtime<Round & { results: RoundResults }>("round:ended", (r) => {
    setRound(null, null);
    setWinners(r.results);
    window.clearTimeout(hideWinners.current);
    hideWinners.current = window.setTimeout(() => setWinners(null), 25_000);
  });
  useRealtime("event:update", load);
  useRealtime("resync", load);

  const joinUrl = origin || "";
  const round = state?.round ?? null;
  const showCountdown =
    round !== null && round.id !== countdownDone && (round.status === "COUNTDOWN" || round.id === countdownSeen);

  return (
    <main className="flex h-dvh w-screen flex-col gap-[1.5vh] overflow-hidden p-[1.6vw]">
      <header className="flex items-center gap-[2vw] border-b-2 border-ink pb-[1.2vh]">
        <GdgLogo size={26} />
        <span className="flex items-center gap-2 text-[1vw] font-extrabold uppercase">
          <span className={`block h-2.5 w-2.5 rounded-full ${live ? "bg-ggreen" : "blink bg-gyellow"}`} />
          {state?.event ? "En vivo" : "Sin evento"}
        </span>
        <span className="min-w-0 flex-1 truncate text-[1.7vw] font-black">{state?.event?.name ?? "Bingo GDG"}</span>
        <span className="text-[1.3vw] font-extrabold">
          {state?.players ?? 0} <span className="text-muted">jugando</span>
        </span>
      </header>

      {/* Una sola columna desde que se fue el Top 10: no hay marcador general
          que mostrar, y la ronda y el QR se ven mejor grandes desde el fondo. */}
      <div className="flex min-h-0 flex-1 flex-col gap-[1.5vw]">
        <section className="flex min-h-0 flex-col gap-[1.5vh]">
          {round && round.status === "ACTIVE" ? (
            <RoundLive round={round} progress={state?.progress ?? EMPTY} />
          ) : (
            <HowToPlay />
          )}

          <div className="card flex items-center gap-[1.2vw] p-[1.2vw]">
            {joinUrl && <QrCode value={joinUrl} size={130} />}
            <div className="min-w-0">
              <BingoWordmark size={26} />
              <p className="mt-[1vh] text-[1.1vw] font-semibold">Entra desde tu celular:</p>
              <p className="break-all text-[1.5vw] font-black">{joinUrl.replace(/^https?:\/\//, "")}</p>
            </div>
          </div>
        </section>
      </div>

      {winners && <WinnersOverlay results={winners} />}

      {showCountdown && round && (
        <CountdownOverlay
          key={round.id}
          startsAt={round.startsAt}
          offset={offset}
          projector
          onDone={() => setCountdownDone(round.id)}
        />
      )}
    </main>
  );
}

export default function ScreenPage() {
  return (
    <RealtimeProvider enabled screen>
      <Screen />
    </RealtimeProvider>
  );
}
