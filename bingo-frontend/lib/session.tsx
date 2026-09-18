"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ApiError, auth, me as meApi } from "./api";
import { levelFromXp, tierForLevel, titleForLevel, xpForLevel } from "./progression";
import type { GameSession, MeResponse, PointsEvent } from "./types";

type Status = "loading" | "guest" | "ready" | "offline";

type SessionValue = {
  status: Status;
  me: MeResponse | null;
  /** Diferencia entre el reloj del servidor y el del celular, en ms. */
  clockOffset: number;
  refresh: () => Promise<MeResponse | null>;
  applyPoints: (event: PointsEvent) => void;
  setGame: (game: GameSession | null) => void;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

/**
 * Estado de la sesion. Todo vive en el servidor (cookie firmada de 60 dias):
 * al recargar o volver a abrir la pagina, /api/me devuelve el personaje tal cual.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [me, setMe] = useState<MeResponse | null>(null);
  const [clockOffset, setClockOffset] = useState(0);
  const inflight = useRef<Promise<MeResponse | null> | null>(null);

  const refresh = useCallback(() => {
    if (inflight.current) return inflight.current;
    inflight.current = meApi
      .get()
      .then((data) => {
        setMe(data);
        if (data.game) setClockOffset(data.game.serverNow - Date.now());
        setStatus("ready");
        return data;
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          setMe(null);
          setStatus("guest");
        } else {
          setStatus((prev) => (prev === "ready" ? prev : "offline"));
        }
        return null;
      })
      .finally(() => {
        inflight.current = null;
      });
    return inflight.current;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Actualiza puntos, XP y nivel al instante con el evento en tiempo real. */
  const applyPoints = useCallback((event: PointsEvent) => {
    setMe((prev) => {
      if (!prev) return prev;
      const level = levelFromXp(event.xp);
      const tier = tierForLevel(level);
      return {
        ...prev,
        standing: prev.standing ? { ...prev.standing, points: event.points } : prev.standing,
        player: {
          ...prev.player,
          level,
          tier: tier.key,
          title: titleForLevel(level),
          progress: {
            xp: event.xp,
            level,
            levelXp: xpForLevel(level),
            nextLevelXp: xpForLevel(level + 1),
            tier: tier.key,
            tierName: tier.name,
            title: titleForLevel(level),
          },
        },
      };
    });
  }, []);

  /**
   * El juego llega completo en el evento en vivo: se guarda sin pedir /me.
   * Con cientos de celulares, que todos recarguen a la vez seria un pico inutil.
   */
  const setGame = useCallback((game: GameSession | null) => {
    if (game) setClockOffset(game.serverNow - Date.now());
    setMe((prev) => (prev ? { ...prev, game } : prev));
  }, []);

  const logout = useCallback(async () => {
    try {
      await auth.logout();
    } finally {
      setMe(null);
      setStatus("guest");
    }
  }, []);

  const value = useMemo(
    () => ({ status, me, clockOffset, refresh, applyPoints, setGame, logout }),
    [status, me, clockOffset, refresh, applyPoints, setGame, logout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession fuera de SessionProvider");
  return ctx;
}

/** Evita redirecciones abiertas: solo rutas internas. */
export function safeNext(next: string | null | undefined, fallback = "/inicio") {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}
