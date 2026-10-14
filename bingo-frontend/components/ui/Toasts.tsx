"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

type ToastKind = "points" | "ok" | "error" | "info";

type Toast = { id: number; kind: ToastKind; title: string; detail?: string };

type ToastApi = {
  push: (toast: Omit<Toast, "id">, durationMs?: number) => void;
  points: (amount: number, label: string) => void;
  ok: (title: string, detail?: string) => void;
  error: (title: string, detail?: string) => void;
  info: (title: string, detail?: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const STYLE: Record<ToastKind, { bg: string; color: string; icon: IconName }> = {
  points: { bg: "#fbbc04", color: "#191919", icon: "star" },
  ok: { bg: "#34a853", color: "#ffffff", icon: "check" },
  error: { bg: "#ea4335", color: "#ffffff", icon: "close" },
  info: { bg: "#4285f4", color: "#ffffff", icon: "flag" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, "id">, durationMs = 3200) => {
      const id = nextId.current++;
      // Maximo 3 a la vez: si llueven avisos, se ven los mas recientes.
      setToasts((list) => [...list.slice(-2), { ...toast, id }]);
      window.setTimeout(() => dismiss(id), durationMs);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      push,
      points: (amount, label) =>
        push({ kind: "points", title: `${amount > 0 ? "+" : ""}${amount} puntos`, detail: label }),
      ok: (title, detail) => push({ kind: "ok", title, detail }),
      error: (title, detail) => push({ kind: "error", title, detail }, 4500),
      info: (title, detail) => push({ kind: "info", title, detail }),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-3" aria-live="polite">
        {toasts.map((t) => {
          const s = STYLE[t.kind];
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => dismiss(t.id)}
              className="rise card pointer-events-auto flex w-full max-w-sm items-center gap-3 px-4 py-3 text-left"
              style={{ background: s.bg, color: s.color }}
            >
              <Icon name={s.icon} size={20} />
              <span className="min-w-0 flex-1">
                <span className="block font-extrabold leading-tight">{t.title}</span>
                {t.detail && <span className="block truncate text-[14px] opacity-90">{t.detail}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast fuera de ToastProvider");
  return ctx;
}
