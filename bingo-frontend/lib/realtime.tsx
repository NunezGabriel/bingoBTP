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
import { API_BASE } from "./api";

type Handler = (data: unknown) => void;

type RealtimeContextValue = {
  connected: boolean;
  subscribe: (type: string, handler: Handler) => () => void;
};

const RealtimeContext = createContext<RealtimeContextValue>({
  connected: false,
  subscribe: () => () => {},
});

/** Tipos de evento que emite el backend (src/realtime/hub.js). */
const EVENT_TYPES = [
  "hello",
  "resync",
  "points",
  "levelup",
  "contact",
  "game:countdown",
  "game:started",
  "game:ended",
  "bingo:signed",
  "bingo:completed",
  "bingo:progress",
  "event:update",
  "session:update",
  "leaderboard",
];

/** Si el stream lleva caido este tiempo, se pide un resync cada tanto (respaldo). */
const FALLBACK_AFTER_MS = 20_000;
const FALLBACK_EVERY_MS = 30_000;

export function RealtimeProvider({
  children,
  enabled = true,
  screen = false,
}: {
  children: ReactNode;
  enabled?: boolean;
  screen?: boolean;
}) {
  const handlers = useRef(new Map<string, Set<Handler>>());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !("EventSource" in window)) return;

    const dispatch = (type: string, data: unknown) => {
      handlers.current.get(type)?.forEach((fn) => {
        try {
          fn(data);
        } catch (error) {
          console.error(`realtime: error en handler de ${type}`, error);
        }
      });
    };

    const source = new EventSource(`${API_BASE}/stream${screen ? "?screen=1" : ""}`, {
      withCredentials: true,
    });

    for (const type of EVENT_TYPES) {
      source.addEventListener(type, (event) => {
        let data: unknown = null;
        try {
          data = JSON.parse((event as MessageEvent).data);
        } catch {
          data = (event as MessageEvent).data;
        }
        dispatch(type, data);
      });
    }

    let downSince: number | null = null;
    let lastFallback = 0;

    source.onopen = () => {
      setConnected(true);
      // Tras un corte largo, puede que el buffer del servidor ya no alcance.
      if (downSince && Date.now() - downSince > FALLBACK_AFTER_MS) dispatch("resync", {});
      downSince = null;
    };
    source.onerror = () => {
      setConnected(false);
      downSince ??= Date.now();
    };

    const watchdog = window.setInterval(() => {
      if (!downSince) return;
      const now = Date.now();
      if (now - downSince > FALLBACK_AFTER_MS && now - lastFallback > FALLBACK_EVERY_MS) {
        lastFallback = now;
        dispatch("resync", {});
      }
    }, 5_000);

    // Al volver a la pestana (celular bloqueado), refrescar por si acaso.
    const onVisible = () => {
      if (document.visibilityState === "visible" && source.readyState !== EventSource.OPEN) {
        dispatch("resync", {});
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(watchdog);
      document.removeEventListener("visibilitychange", onVisible);
      source.close();
      setConnected(false);
    };
  }, [enabled, screen]);

  // Referencia estable: los componentes no se re-suscriben cuando cambia `connected`.
  const subscribe = useCallback((type: string, handler: Handler) => {
    if (!handlers.current.has(type)) handlers.current.set(type, new Set());
    handlers.current.get(type)!.add(handler);
    return () => {
      handlers.current.get(type)?.delete(handler);
    };
  }, []);

  const value = useMemo<RealtimeContextValue>(
    () => ({ connected, subscribe }),
    [connected, subscribe],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtimeStatus() {
  return useContext(RealtimeContext).connected;
}

/** Escucha un tipo de evento. El handler siempre ve el estado mas reciente. */
export function useRealtime<T = unknown>(type: string, handler: (data: T) => void) {
  const { subscribe } = useContext(RealtimeContext);
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => subscribe(type, (data) => ref.current(data as T)), [subscribe, type]);
}
