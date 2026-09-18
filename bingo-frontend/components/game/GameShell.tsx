"use client";

import confetti from "canvas-confetti";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { RealtimeProvider, useRealtime } from "@/lib/realtime";
import { useSession } from "@/lib/session";
import { sfx } from "@/lib/sfx";
import type { BingoResults, GameSession, PointsEvent, Progress, PublicPlayer } from "@/lib/types";
import { Avatar } from "@/components/pixel/Avatar";
import { PixelIcon } from "@/components/pixel/Sprite";
import type { IconName } from "@/components/pixel/icons";
import { useToast } from "@/components/ui/Toasts";
import { Modal } from "@/components/ui/Modal";
import { ErrorBox, Loading } from "@/components/ui/Blocks";
import { CountdownOverlay } from "./Countdown";

type NavItem = { href: string; label: string; icon: IconName; highlight?: boolean };

const PODIUM = ["#ffd23f", "#d3dbe6", "#d8894a"];

function TopBar() {
  const { me } = useSession();
  if (!me) return null;
  const p = me.player;

  return (
    <header className="sticky top-0 z-40 border-b-4 border-ink bg-deep/95">
      <div className="mx-auto flex max-w-md items-center gap-2 px-3 py-2">
        <Avatar cls={p.avatarClass} house={p.avatarHouse} tier={p.tier} size={36} />
        <span className="font-pixel min-w-0 flex-1 truncate text-[11px] text-cream">{p.nickname}</span>
        {me.event && me.standing && (
          <span className="font-pixel shrink-0 bg-ink px-2 pb-[5px] pt-[7px] text-[12px] text-gold">
            {me.standing.points} PTS
          </span>
        )}
      </div>
    </header>
  );
}

function BottomNav({ gameRunning }: { gameRunning: boolean }) {
  const pathname = usePathname();
  const items: NavItem[] = [
    { href: "/inicio", label: "Inicio", icon: "home" },
    { href: "/contactos", label: "Contactos", icon: "users" },
    ...(gameRunning ? [{ href: "/juego", label: "BINGO", icon: "grid" as IconName, highlight: true }] : []),
    { href: "/ranking", label: "Ranking", icon: "trophy" },
    { href: "/cuenta", label: "Cuenta", icon: "user" },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t-4 border-ink bg-deep pb-[env(safe-area-inset-bottom)]">
      <ul className={`mx-auto grid max-w-md ${items.length === 5 ? "grid-cols-5" : "grid-cols-4"}`}>
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href} className="flex justify-center">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 px-1 pb-2 pt-2 ${active ? "text-gyellow" : "text-muted"}`}
              >
                {item.highlight ? (
                  <span
                    className="px-box px-bob -mt-6 flex h-12 w-12 items-center justify-center text-ink"
                    style={{ ["--box-bg" as string]: "#fbbc04" }}
                  >
                    <PixelIcon name={item.icon} size={24} />
                  </span>
                ) : (
                  <PixelIcon name={item.icon} size={22} />
                )}
                <span className="font-pixel text-[8px]">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function LevelUpModal({ progress, onClose }: { progress: Progress | null; onClose: () => void }) {
  const { me } = useSession();
  useEffect(() => {
    if (!progress) return;
    const colors = ["#4285f4", "#ea4335", "#fbbc04", "#34a853", "#ffd23f"];
    confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 }, colors, shapes: ["square"] });
  }, [progress]);
  if (!progress || !me) return null;
  const p = me.player;

  return (
    <Modal open onClose={onClose} title="SUBISTE DE NIVEL">
      <div className="flex flex-col items-center text-center">
        <Avatar cls={p.avatarClass} house={p.avatarHouse} tier={progress.tier} size={150} bob />
        <p className="font-pixel px-pop mt-2 text-[22px] text-gold">NIVEL {progress.level}</p>
        <p className="mt-2 text-[20px] text-cream">{progress.title}</p>
        <button type="button" className="px-btn px-btn-yellow mt-5" onClick={onClose}>
          Genial
        </button>
      </div>
    </Modal>
  );
}

function GameOverModal({ results, onClose }: { results: BingoResults | null; onClose: () => void }) {
  const { me } = useSession();
  if (!results || !me) return null;
  const mine = results.winners.find((w) => w.player.id === me.player.id);

  return (
    <Modal open onClose={onClose} title="TERMINO EL BINGO">
      <div className="flex flex-col items-center text-center">
        {results.winners.length === 0 ? (
          <p className="text-[18px] text-cream">Nadie completo su cartilla esta vez.</p>
        ) : (
          <ol className="flex w-full flex-col gap-1">
            {results.winners.slice(0, 3).map((w) => (
              <li key={w.player.id} className="px-inset flex items-center gap-3 p-2 text-left">
                <span className="font-pixel w-8 text-center text-[16px]" style={{ color: PODIUM[w.rank - 1] }}>
                  {w.rank}
                </span>
                <Avatar cls={w.player.avatarClass} house={w.player.avatarHouse} tier={w.player.tier} size={44} />
                <span className="font-pixel min-w-0 flex-1 truncate text-[10px] text-cream">{w.player.nickname}</span>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-4 text-[17px] text-muted">
          {mine ? `Quedaste en el puesto #${mine.rank}.` : "Tus firmas ya suman en el ranking."}
        </p>
        <button type="button" className="px-btn px-btn-yellow mt-5" onClick={onClose}>
          OK
        </button>
      </div>
    </Modal>
  );
}

/** Traduce los eventos en vivo del servidor en avisos, sonidos y estado. */
function GameBridge() {
  const { me, clockOffset, refresh, applyPoints, setGame } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [levelUp, setLevelUp] = useState<Progress | null>(null);
  const [gameOver, setGameOver] = useState<BingoResults | null>(null);
  // Juego cuya cuenta regresiva ya termino de mostrarse, y juego cuya cuenta vimos empezar.
  const [countdownDoneId, setCountdownDoneId] = useState<number | null>(null);
  const [countdownSeenId, setCountdownSeenId] = useState<number | null>(null);
  const rankTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(rankTimer.current), []);

  const openGame = () => {
    if (pathname !== "/juego") router.push("/juego");
  };

  useRealtime<PointsEvent>("points", (e) => {
    applyPoints(e);
    // El puesto depende de todos los demas: se recalcula una vez tras una racha de puntos.
    window.clearTimeout(rankTimer.current);
    rankTimer.current = window.setTimeout(() => void refresh(), 4000);
    toast.points(e.amount, e.label);
    sfx.coin();
  });
  useRealtime<Progress>("levelup", (progress) => {
    sfx.levelUp();
    setLevelUp(progress);
    void refresh();
  });
  useRealtime<{ with: PublicPlayer }>("contact", (e) => {
    toast.info("Nuevo contacto", `${e.with.nickname} te agrego`);
  });
  useRealtime<{ for: PublicPlayer }>("bingo:signed", (e) => {
    toast.info("Firmaste un bingo", `Ayudaste a ${e.for.nickname}`);
  });
  useRealtime<{ rank: number; player: PublicPlayer }>("bingo:completed", (e) => {
    if (e.player.id === me?.player.id) return; // su propia pantalla ya lo celebra
    toast.info(`BINGO #${e.rank}`, `${e.player.nickname} completo su cartilla`);
  });

  useRealtime<GameSession>("game:countdown", (g) => {
    setCountdownSeenId(g.id);
    setGame(g);
  });
  useRealtime<GameSession>("game:started", (g) => {
    const sawCountdown = countdownSeenId === g.id || (me?.game?.id === g.id && me.game.status === "COUNTDOWN");
    if (sawCountdown) setCountdownSeenId(g.id);
    setGame(g);
    if (!sawCountdown) {
      // Se perdio la cuenta (celular bloqueado o reconectando): igual lo llevamos al juego.
      sfx.go();
      openGame();
    }
  });
  useRealtime<GameSession & { results: BingoResults }>("game:ended", (g) => {
    setGame(null);
    if (me?.event) {
      sfx.alert();
      setGameOver(g.results);
    }
  });

  useRealtime("event:update", () => window.setTimeout(() => void refresh(), Math.random() * 2500));
  useRealtime("session:update", () => void refresh());
  useRealtime("resync", () => void refresh());

  const game = me?.game ?? null;
  const showCountdown =
    game !== null && game.id !== countdownDoneId && (game.status === "COUNTDOWN" || game.id === countdownSeenId);

  return (
    <>
      {showCountdown && game && (
        <CountdownOverlay
          key={game.id}
          startsAt={game.startsAt}
          offset={clockOffset}
          onDone={() => {
            setCountdownDoneId(game.id);
            openGame();
          }}
        />
      )}
      <LevelUpModal progress={levelUp} onClose={() => setLevelUp(null)} />
      <GameOverModal results={gameOver} onClose={() => setGameOver(null)} />
    </>
  );
}

/** Envuelve todas las pantallas del jugador: exige sesion y conecta el tiempo real. */
export function GameShell({ children }: { children: ReactNode }) {
  const { status, me, refresh } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "guest") router.replace(`/entrar?next=${encodeURIComponent(pathname)}`);
  }, [status, router, pathname]);

  // Desbloquea el audio en iOS con el primer toque.
  useEffect(() => {
    const unlock = () => sfx.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  if (status === "loading" || status === "guest") {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <Loading label="Cargando" />
      </main>
    );
  }
  if (status === "offline" || !me) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md items-center px-4">
        <ErrorBox message="No pudimos conectar con el servidor." onRetry={() => void refresh()} />
      </main>
    );
  }

  return (
    <RealtimeProvider enabled>
      <GameBridge />
      <TopBar />
      <main className="mx-auto w-full max-w-md px-3 pb-28 pt-3">{children}</main>
      <BottomNav gameRunning={Boolean(me.game)} />
    </RealtimeProvider>
  );
}
