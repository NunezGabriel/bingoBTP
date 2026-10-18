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
import type { MeResponse, PointsEvent, Round } from "./types";

type Status = "loading" | "guest" | "ready" | "offline";

type SessionValue = {
  status: Status;
  me: MeResponse | null;
  /** Diferencia entre el reloj del servidor y el del celular, en ms. */
  clockOffset: number;
  refresh: () => Promise<MeResponse | null>;
  applyPoints: (event: PointsEvent) => void;
  setRound: (round: Round | null) => void;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

/**
 * Estado de la sesion. Todo vive en el servidor (cookie firmada de 60 dias):
 * al recargar o volver a abrir la pagina, /api/me devuelve la cuenta tal cual.
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
        if (data.round) setClockOffset(data.round.serverNow - Date.now());
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

  /** Actualiza los puntos al instante con el evento en vivo. */
  const applyPoints = useCallback((event: PointsEvent) => {
    setMe((prev) =>
      prev?.standing ? { ...prev, standing: { ...prev.standing, points: event.points } } : prev,
    );
  }, []);

  /**
   * La ronda llega completa en el evento en vivo: se guarda sin pedir /me.
   * Con cientos de celulares, que todos recarguen a la vez seria un pico inutil.
   */
  const setRound = useCallback((round: Round | null) => {
    if (round) setClockOffset(round.serverNow - Date.now());
    setMe((prev) => (prev ? { ...prev, round } : prev));
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
    () => ({ status, me, clockOffset, refresh, applyPoints, setRound, logout }),
    [status, me, clockOffset, refresh, applyPoints, setRound, logout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession fuera de SessionProvider");
  return ctx;
}

/** Evita redirecciones abiertas: solo rutas internas. */
export function safeNext(next: string | null | undefined, fallback = "/lobby") {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}
