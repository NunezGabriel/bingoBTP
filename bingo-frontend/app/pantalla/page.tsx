"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { publicApi, type ScreenData } from "@/lib/api";
import { RealtimeProvider, useRealtime, useRealtimeStatus } from "@/lib/realtime";
import { HOUSES } from "@/lib/sprites";
import type { BingoResults, GameSession, HouseRow, LeaderboardRow, PublicPlayer } from "@/lib/types";
import { useOrigin } from "@/lib/useOrigin";
import { Avatar } from "@/components/pixel/Avatar";
import { Volcano } from "@/components/pixel/Brand";
import { PixelIcon } from "@/components/pixel/Sprite";
import { QrCode } from "@/components/game/QrCode";
import { CountdownOverlay } from "@/components/game/Countdown";

const PODIUM = ["#ffd23f", "#d3dbe6", "#d8894a"];
const EMPTY_RESULTS: BingoResults = { boards: 0, completed: 0, winners: [], closest: [] };

function BingoLive({ game, results }: { game: GameSession; results: BingoResults }) {
  return (
    <div className="px-box flex min-h-0 flex-1 flex-col overflow-hidden p-[1.2vw]" style={{ ["--box-bg" as string]: "#2d2257" }}>
      <div className="flex items-center justify-between">
        <h2 className="font-pixel flex items-center gap-[0.6vw] text-[1.3vw] text-gyellow">
          <PixelIcon name="grid" size={30} /> BINGO EN CURSO
        </h2>
        <span className="font-pixel text-[1vw] text-cream">
          {results.completed}/{results.boards} <span className="text-muted">COMPLETAS</span>
        </span>
      </div>
      <p className="mt-[0.6vh] text-[1.1vw] text-muted">
        Pide su codigo a quien cumpla cada casilla · +{game.cellPoints} por firma · +{game.completePoints} al completar
      </p>

      <div className="mt-[1.4vh] grid grid-cols-3 gap-[0.8vw]">
        {[1, 2, 3].map((rank) => {
          const w = results.winners.find((x) => x.rank === rank);
          return (
            <div key={rank} className="px-inset flex flex-col items-center p-[0.8vw] text-center">
              <span className="font-pixel text-[1.6vw]" style={{ color: PODIUM[rank - 1] }}>
                {rank}
              </span>
              {w ? (
                <>
                  <Avatar cls={w.player.avatarClass} house={w.player.avatarHouse} tier={w.player.tier} size={72} bob />
                  <span className="font-pixel mt-[0.4vh] w-full truncate text-[0.9vw] text-cream">{w.player.nickname}</span>
                  <span className="font-pixel text-[0.8vw] text-gold">+{game.podiumBonus[rank - 1]} EXTRA</span>
                </>
              ) : (
                <span className="mt-[1vh] text-[1.1vw] text-muted">libre</span>
              )}
            </div>
          );
        })}
      </div>

      {results.closest.length > 0 && (
        <>
          <h3 className="font-pixel mt-[1.6vh] text-[0.9vw] text-muted">VAN MAS CERCA</h3>
          <ul className="mt-[0.6vh] flex min-h-0 flex-col gap-[0.6vh] overflow-hidden">
            {results.closest.slice(0, 4).map((c) => (
              <li key={c.player.id} className="flex items-center gap-[0.8vw]">
                <Avatar cls={c.player.avatarClass} house={c.player.avatarHouse} tier={c.player.tier} size={36} />
                <span className="min-w-0 flex-1 truncate text-[1.2vw] text-cream">{c.player.nickname}</span>
                <span className="font-pixel text-[1vw] text-gold">{c.signed}/9</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function HowToPlay() {
  const steps = [
    "Crea tu personaje con tu nombre y un PIN",
    "Ensena tu codigo para que te den puntos",
    "Cuando empiece el bingo, tu celular avisa",
  ];
  return (
    <div className="px-box flex min-h-0 flex-1 flex-col justify-center p-[1.2vw]">
      <h2 className="font-pixel text-[1.1vw] text-gyellow">COMO JUGAR</h2>
      <ol className="mt-[1.5vh] flex flex-col gap-[1.4vh]">
        {steps.map((step, i) => (
          <li key={step} className="flex items-center gap-[1vw]">
            <span className="font-pixel bg-ink px-[0.8vw] py-[0.6vh] text-[1.4vw] text-gyellow">{i + 1}</span>
            <span className="text-[1.3vw] leading-tight text-cream">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function WinnersOverlay({ results }: { results: BingoResults }) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-night/95 px-[4vw]">
      <p className="font-pixel text-[3vw] text-gyellow" style={{ textShadow: "4px 4px 0 #14142b" }}>
        GANADORES DEL BINGO
      </p>
      {results.winners.length === 0 ? (
        <p className="mt-[4vh] text-[2.4vw] text-cream">Nadie completo su cartilla esta vez</p>
      ) : (
        <div className="mt-[5vh] flex items-end gap-[3vw]">
          {[2, 1, 3].map((rank) => {
            const w = results.winners.find((x) => x.rank === rank);
            if (!w) return <span key={rank} className="w-[16vw]" />;
            return (
              <div key={rank} className="flex w-[16vw] flex-col items-center text-center">
                <Avatar
                  cls={w.player.avatarClass}
                  house={w.player.avatarHouse}
                  tier={w.player.tier}
                  size={rank === 1 ? 220 : 160}
                  bob
                />
                <span className="font-pixel mt-[1vh] w-full truncate text-[1.5vw] text-cream">{w.player.nickname}</span>
                <span
                  className="px-box font-pixel mt-[1vh] flex w-full items-center justify-center text-[3vw] text-ink"
                  style={{ ["--box-bg" as string]: PODIUM[rank - 1], height: rank === 1 ? "16vh" : rank === 2 ? "11vh" : "8vh" }}
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
  const [winners, setWinners] = useState<BingoResults | null>(null);
  const hideWinners = useRef<number | undefined>(undefined);
  const origin = useOrigin();
  const live = useRealtimeStatus();

  const load = useCallback(() => {
    publicApi
      .screen()
      .then((s) => {
        setState({
          ...s,
          top: s.top ?? [],
          houses: s.houses ?? [],
          players: s.players ?? 0,
          game: s.game ?? null,
          bingo: s.bingo ?? null,
        });
        if (s.game) setOffset(s.game.serverNow - Date.now());
      })
      .catch(() => {
        /* se reintenta con el siguiente resync */
      });
  }, []);

  useEffect(() => {
    load();
    // Respaldo liviano: la pantalla es una sola, puede refrescar cada 30 s.
    const id = window.setInterval(load, 30_000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(hideWinners.current);
    };
  }, [load]);

  useRealtime<{ top: LeaderboardRow[]; houses: HouseRow[] }>("leaderboard", (lb) =>
    setState((s) => (s ? { ...s, top: lb.top, houses: lb.houses } : s)),
  );

  const setGame = (game: GameSession | null, bingo: BingoResults | null) => {
    if (game) setOffset(game.serverNow - Date.now());
    setState((s) => (s ? { ...s, game, bingo } : s));
  };
  useRealtime<GameSession>("game:countdown", (g) => {
    window.clearTimeout(hideWinners.current);
    setWinners(null);
    setCountdownSeen(g.id);
    setGame(g, EMPTY_RESULTS);
  });
  useRealtime<GameSession>("game:started", (g) => setGame(g, state?.bingo ?? EMPTY_RESULTS));
  useRealtime<BingoResults & { sessionId: number }>("bingo:progress", (p) =>
    setState((s) => (s && s.game?.id === p.sessionId ? { ...s, bingo: p } : s)),
  );
  useRealtime<{ sessionId: number; rank: number; player: PublicPlayer }>("bingo:completed", (e) =>
    setState((s) => {
      if (!s || s.game?.id !== e.sessionId) return s;
      const bingo = s.bingo ?? EMPTY_RESULTS;
      if (bingo.winners.some((w) => w.rank === e.rank)) return s;
      const list = [...bingo.winners, { rank: e.rank, player: e.player }].sort((a, b) => a.rank - b.rank);
      return { ...s, bingo: { ...bingo, winners: list, completed: Math.max(bingo.completed, e.rank) } };
    }),
  );
  useRealtime<GameSession & { results: BingoResults }>("game:ended", (g) => {
    setGame(null, null);
    setWinners(g.results);
    window.clearTimeout(hideWinners.current);
    hideWinners.current = window.setTimeout(() => setWinners(null), 25_000);
  });
  useRealtime("event:update", load);
  useRealtime("resync", load);

  const joinUrl = origin || "";
  const game = state?.game ?? null;
  // Tras la cuenta se muestra "A JUGAR" un instante aunque el juego ya haya arrancado.
  const showCountdown =
    game !== null && game.id !== countdownDone && (game.status === "COUNTDOWN" || game.id === countdownSeen);

  return (
    <main className="relative flex h-dvh w-screen flex-col gap-[1.5vh] overflow-hidden p-[1.6vw]">
      <header className="flex items-center gap-[2vw] border-b-4 border-ink pb-[1.2vh]">
        <span
          className="font-pixel whitespace-nowrap text-[1.9vw] text-cream"
          style={{ textShadow: "3px 3px 0 #ea4335, 5px 5px 0 #14142b" }}
        >
          MISTI QUEST
        </span>
        <span className="font-pixel flex items-center gap-2 whitespace-nowrap text-[0.9vw] text-ggreen">
          <span className={`block h-2 w-2 ${live ? "bg-ggreen" : "px-blink bg-gyellow"}`} />
          {state?.event ? "EN VIVO" : "SIN EVENTO"}
        </span>
        <span className="font-pixel min-w-0 flex-1 truncate text-[1.5vw] text-gyellow">
          {state?.event?.name ?? "GDG Arequipa"}
        </span>
        <span className="font-pixel whitespace-nowrap text-[1.2vw] text-cream">
          {state?.players ?? 0} <span className="text-muted">JUGADORES</span>
        </span>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[1.35fr_1fr] gap-[1.5vw]">
        {/* ranking: 10 filas iguales que siempre caben en la altura disponible */}
        <section className="flex min-h-0 flex-col">
          <h2 className="font-pixel text-[1.1vw] text-gyellow">TOP 10</h2>
          <ol className="mt-[1vh] grid min-h-0 flex-1 grid-rows-10 gap-[0.7vh]">
            {(state?.top ?? []).slice(0, 10).map((r) => (
              <li
                key={r.player.id}
                className="px-box flex min-h-0 items-center gap-[1.2vw] px-[1.2vw]"
                style={{ ["--box-bg" as string]: r.rank <= 3 ? "#2d2257" : "#1f1f45" }}
              >
                <span className="font-pixel w-[3vw] text-center text-[1.5vw]" style={{ color: PODIUM[r.rank - 1] ?? "#9f9fc7" }}>
                  {r.rank}
                </span>
                <Avatar cls={r.player.avatarClass} house={r.player.avatarHouse} tier={r.player.tier} size={48} />
                <span className="min-w-0 flex-1">
                  <span className="font-pixel block truncate text-[1.2vw] text-cream">{r.player.nickname}</span>
                  <span className="block truncate text-[1vw] text-muted">
                    Nv {r.player.level} · Casa {HOUSES[r.player.avatarHouse].name}
                  </span>
                </span>
                <span className="font-pixel text-[1.7vw] text-gold">{r.points}</span>
              </li>
            ))}
            {state && state.top.length === 0 && (
              <li className="px-box row-span-10 flex items-center justify-center text-[1.6vw] text-muted">
                El ranking aparecera cuando alguien sume puntos
              </li>
            )}
          </ol>
        </section>

        <section className="flex min-h-0 flex-col gap-[1.5vh]">
          <div className="px-box p-[1.2vw]">
            <h2 className="font-pixel mb-[1vh] text-[1.1vw] text-gyellow">COPA DE CASAS</h2>
            {state && <HouseBarsLarge houses={state.houses} />}
          </div>

          {game && game.status === "ACTIVE" ? (
            <BingoLive game={game} results={state?.bingo ?? EMPTY_RESULTS} />
          ) : (
            <HowToPlay />
          )}

          <div className="px-box flex items-center gap-[1.2vw] p-[1vw]" style={{ ["--box-bg" as string]: "#f7f3e8" }}>
            {joinUrl && <QrCode value={joinUrl} size={120} />}
            <div className="min-w-0 text-ink">
              <p className="font-pixel text-[1.1vw]">ENTRA DESDE TU CELULAR</p>
              <p className="font-pixel mt-[0.8vh] break-all text-[1.4vw]">{joinUrl.replace(/^https?:\/\//, "")}</p>
            </div>
          </div>
        </section>
      </div>

      <Volcano width={260} className="pointer-events-none absolute bottom-0 right-[35vw] opacity-20" />

      {winners && <WinnersOverlay results={winners} />}

      {showCountdown && game && (
        <CountdownOverlay
          key={game.id}
          startsAt={game.startsAt}
          offset={offset}
          projector
          onDone={() => setCountdownDone(game.id)}
        />
      )}
    </main>
  );
}

function HouseBarsLarge({ houses }: { houses: HouseRow[] }) {
  const max = Math.max(1, ...houses.map((h) => h.points));
  return (
    <ul className="flex flex-col gap-[1vh]">
      {houses.map((h) => {
        const house = HOUSES[h.house];
        return (
          <li key={h.house} className="flex items-center gap-[0.8vw]">
            <span className="font-pixel w-[7vw] text-[0.9vw]" style={{ color: house.P }}>
              {house.name.toUpperCase()}
            </span>
            <div className="h-[2.6vh] flex-1 bg-ink p-[3px]">
              <div
                className="h-full transition-[width] duration-700"
                style={{
                  width: `${(h.points / max) * 100}%`,
                  backgroundImage: `repeating-linear-gradient(90deg, ${house.P} 0, ${house.P} 10px, ${house.Q} 10px, ${house.Q} 12px)`,
                }}
              />
            </div>
            <span className="font-pixel w-[5vw] text-right text-[1vw] text-cream">{h.points}</span>
            <span className="w-[4.5vw] text-right text-[0.9vw] text-muted">{h.players} jug.</span>
          </li>
        );
      })}
    </ul>
  );
}

export default function ScreenPage() {
  return (
    <RealtimeProvider enabled screen>
      <Screen />
    </RealtimeProvider>
  );
}
