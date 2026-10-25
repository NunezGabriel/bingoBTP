"use client";

import confetti from "canvas-confetti";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { RealtimeProvider, useRealtime } from "@/lib/realtime";
import { useSession } from "@/lib/session";
import { sfx } from "@/lib/sfx";
import type { Player, PointsEvent, Round, RoundResults } from "@/lib/types";
import { GdgMark } from "@/components/Brand";
import { CountdownOverlay } from "@/components/Countdown";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { ErrorBox, Loading } from "@/components/ui/Blocks";
import { useToast } from "@/components/ui/Toasts";

/**
 * Tres destinos y nada mas. La cartilla no esta aqui a proposito: aparece sola
 * cuando el admin empieza la ronda y desaparece cuando termina, asi nadie entra
 * a una cartilla vieja ni se pregunta por que esta vacia.
 */
const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/lobby", label: "Plaza", icon: "home" },
  { href: "/misiones", label: "Misiones", icon: "check" },
  { href: "/cuenta", label: "Mi cuenta", icon: "user" },
];

/** El lobby y la cartilla ocupan toda la pantalla: sin barra de arriba. */
const FULL_BLEED = ["/lobby"];

/**
 * Pantallas que en monitor se abren a dos columnas. Las demas se quedan en
 * ancho de celular aunque sobre sitio: una lista estirada se lee peor.
 */
const ANCHAS = ["/misiones"];

/** El ancho del contenido. Las tres barras tienen que usar el mismo. */
function anchoDe(pathname: string) {
  return ANCHAS.includes(pathname) ? "max-w-md md:max-w-4xl" : "max-w-md";
}

const PODIUM = ["#fbbc04", "#c9c9c9", "#cd7f32"];

function TopBar() {
  const { me } = useSession();
  const pathname = usePathname();
  if (!me) return null;
  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-paper/95 backdrop-blur-sm">
      <div className={`mx-auto flex ${anchoDe(pathname)} items-center gap-2 px-4 py-2.5`}>
        <GdgMark size={20} />
        <span className="min-w-0 flex-1 truncate font-extrabold">{me.player.name}</span>
      </div>
    </header>
  );
}

// Negra y no blanca: sobre la plaza de noche la franja blanca cortaba la
// pantalla en dos y se comia el final del lobby.
function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-ink pb-[env(safe-area-inset-bottom)]">
      <ul className={`mx-auto grid ${anchoDe(pathname)} grid-cols-3`}>
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href} className="flex justify-center">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex w-full flex-col items-center gap-1 py-3 text-[14px] font-extrabold ${active ? "text-gblue" : "text-white/55"}`}
              >
                <Icon name={item.icon} size={28} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function RoundOverModal({ results, onClose }: { results: RoundResults | null; onClose: () => void }) {
  const { me } = useSession();
  if (!results || !me) return null;
  const mine = results.winners.find((w) => w.player.id === me.player.id);

  return (
    <Modal open onClose={onClose} title="Termino la ronda">
      {results.winners.length === 0 ? (
        <p className="text-[17px]">Nadie completo su cartilla esta vez.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {results.winners.slice(0, 3).map((w) => (
            <li key={w.player.id} className="card-flat flex items-center gap-3 p-3">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink font-extrabold"
                style={{ background: PODIUM[w.rank - 1] }}
              >
                {w.rank}
              </span>
              <span className="min-w-0 flex-1 truncate font-bold">{w.player.name}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-4 text-[15px] text-muted">
        {mine ? `Quedaste en el puesto #${mine.rank}.` : "Tus firmas ya suman en el ranking."}
      </p>
      <button type="button" className="btn btn-blue mt-4 w-full" onClick={onClose}>
        Entendido
      </button>
    </Modal>
  );
}

/** Traduce los eventos en vivo del servidor en avisos, sonidos y estado. */
function LiveBridge() {
  const { me, clockOffset, refresh, setRound } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [roundOver, setRoundOver] = useState<RoundResults | null>(null);
  const [countdownDoneId, setCountdownDoneId] = useState<number | null>(null);
  const [countdownSeenId, setCountdownSeenId] = useState<number | null>(null);
  const rankTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(rankTimer.current), []);

  const openCard = () => {
    if (pathname !== "/cartilla") router.push("/cartilla");
  };

  /**
   * A la cartilla solo va quien ya entro con el codigo, no todo el que tenga
   * la app abierta: en el evento hay dos auditorios y cada ronda es de uno.
   *
   * Vale igual para quien abrio la app con la ronda ya empezada. Si entro con
   * el codigo y luego se le bloqueo el celular, al volver se le lleva a su
   * cartilla sin que tenga que buscarla: no esta en el menu.
   */
  const round = me?.round ?? null;
  const enRonda = me?.enRonda ?? false;
  useEffect(() => {
    if (enRonda && round?.status === "ACTIVE" && pathname !== "/cartilla") router.push("/cartilla");
  }, [enRonda, round?.status, pathname, router]);

  // Los puntos del bingo ya no se acumulan en ningun marcador, pero el aviso
  // sigue siendo util mientras se juega: dice que la firma entro.
  useRealtime<PointsEvent>("points", (e) => {
    toast.points(e.amount, e.label);
    sfx.ok();
  });
  /**
   * Una mision validada avisa este donde este.
   *
   * Antes solo la escuchaba la pantalla de Misiones, asi que si el organizador
   * te escaneaba mientras andabas por la plaza -que es donde esta todo el
   * mundo- en tu celular no pasaba nada de nada.
   */
  useRealtime<{ title: string; done: number; total: number; completa: boolean }>(
    "mission:done",
    (e) => {
      sfx.ok();
      if (e.completa) toast.ok("Tarjeta completa!", "Reclama tu premio al final del evento");
      else toast.ok(`Mision validada: ${e.title}`, `Llevas ${e.done} de ${e.total}`);
    },
  );

  useRealtime<{ for: Player }>("bingo:signed", (e) => {
    toast.info("Firmaste una cartilla", `Ayudaste a ${e.for.name}`);
  });
  useRealtime<{ rank: number; player: Player }>("bingo:completed", (e) => {
    if (e.player.id === me?.player.id) return; // su propia pantalla ya lo celebra
    toast.info(`BINGO #${e.rank}`, `${e.player.name} completo su cartilla`);
  });

  useRealtime<Round>("round:countdown", (r) => {
    setCountdownSeenId(r.id);
    setRound(r);
  });
  useRealtime<Round>("round:started", (r) => {
    const sawCountdown = countdownSeenId === r.id || (me?.round?.id === r.id && me.round.status === "COUNTDOWN");
    if (sawCountdown) setCountdownSeenId(r.id);
    setRound(r);
    if (!sawCountdown && enRonda) {
      // Se perdio la cuenta (celular bloqueado o reconectando): igual lo llevamos a su cartilla.
      sfx.go();
      openCard();
    }
  });
  useRealtime<Round & { results: RoundResults }>("round:ended", (r) => {
    setRound(null);
    if (me?.event) {
      sfx.ok();
      setRoundOver(r.results);
    }
    // Terminada la ronda todos vuelven a la plaza, que es donde se espera a la
    // siguiente; asi los que llegaron tarde ya estan ahi cuando el admin la empieza.
    if (pathname === "/cartilla") router.push("/lobby");
  });

  useRealtime("event:update", () => window.setTimeout(() => void refresh(), Math.random() * 2500));
  useRealtime("session:update", () => void refresh());
  useRealtime("resync", () => void refresh());

  // La cuenta regresiva es solo para quien ya entro con el codigo. Al resto le
  // taparia la plaza con un 3-2-1 de una partida que no es la suya: en el
  // evento hay dos auditorios y cada ronda pertenece a uno.
  const showCountdown =
    enRonda &&
    round !== null &&
    round.id !== countdownDoneId &&
    (round.status === "COUNTDOWN" || round.id === countdownSeenId);

  return (
    <>
      {showCountdown && round && (
        <CountdownOverlay
          key={round.id}
          startsAt={round.startsAt}
          offset={clockOffset}
          onDone={() => {
            setCountdownDoneId(round.id);
            openCard();
          }}
        />
      )}
      <RoundOverModal results={roundOver} onClose={() => setRoundOver(null)} />
    </>
  );
}

export function celebrate() {
  confetti({
    particleCount: 140,
    spread: 100,
    origin: { y: 0.6 },
    colors: ["#4285f4", "#ea4335", "#fbbc04", "#34a853"],
  });
}

/** Envuelve las pantallas del jugador: exige sesion y conecta el tiempo real. */
export function GameShell({ children }: { children: ReactNode }) {
  const { status, me, refresh } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const full = FULL_BLEED.includes(pathname);

  useEffect(() => {
    if (status === "guest") {
      router.replace(`/entrar?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (status !== "ready" || !me) return;
    // Un admin no juega: se va derecho a su panel.
    if (me.player.role === "ADMIN") {
      router.replace("/admin");
      return;
    }
    // Sin personaje elegido no tiene nada que hacer en el lobby.
    if (!me.player.skin) router.replace(`/personaje?next=${encodeURIComponent(pathname)}`);
  }, [status, me, router, pathname]);

  // Desbloquea el audio en iOS con el primer toque.
  useEffect(() => {
    const unlock = () => sfx.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  if (status === "loading" || status === "guest") {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <Loading />
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
      <LiveBridge />
      {!full && <TopBar />}
      <main className={full ? "w-full" : `mx-auto w-full ${anchoDe(pathname)} px-4 pb-24 pt-4`}>
        {children}
      </main>
      <BottomNav />
    </RealtimeProvider>
  );
}
