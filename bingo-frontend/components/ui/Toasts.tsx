"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { PixelIcon } from "@/components/pixel/Sprite";
import type { IconName } from "@/components/pixel/icons";

type ToastKind = "points" | "success" | "error" | "info" | "announcement";

type Toast = {
  id: number;
  kind: ToastKind;
  title: string;
  detail?: string;
  amount?: number;
};

type ToastApi = {
  push: (toast: Omit<Toast, "id">, durationMs?: number) => void;
  points: (amount: number, label: string) => void;
  success: (title: string, detail?: string) => void;
  error: (title: string, detail?: string) => void;
  info: (title: string, detail?: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const STYLE: Record<ToastKind, { bg: string; text: string; icon: IconName }> = {
  points: { bg: "#ffd23f", text: "#14142b", icon: "star" },
  success: { bg: "#34a853", text: "#ffffff", icon: "check" },
  error: { bg: "#ea4335", text: "#ffffff", icon: "close" },
  info: { bg: "#2a2a5a", text: "#f7f3e8", icon: "bell" },
  announcement: { bg: "#4285f4", text: "#ffffff", icon: "bell" },
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
      // Maximo 4 a la vez: si llueven puntos, se ven los mas recientes.
      setToasts((list) => [...list.slice(-3), { ...toast, id }]);
      window.setTimeout(() => dismiss(id), durationMs);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      push,
      points: (amount, label) =>
        push({ kind: "points", title: `${amount > 0 ? "+" : ""}${amount} PTS`, detail: label, amount }),
      success: (title, detail) => push({ kind: "success", title, detail }),
      error: (title, detail) => push({ kind: "error", title, detail }, 4500),
      info: (title, detail) => push({ kind: "info", title, detail }),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-2 z-[60] flex flex-col items-center gap-1 px-3"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const s = STYLE[t.kind];
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => dismiss(t.id)}
              className="px-box px-slide-down pointer-events-auto flex w-full max-w-sm items-center gap-3 px-3 py-2 text-left"
              style={{ ["--box-bg" as string]: s.bg, color: s.text }}
            >
              <PixelIcon name={s.icon} size={18} />
              <span className="min-w-0 flex-1">
                <span className="font-pixel block text-[11px]">{t.title}</span>
                {t.detail && <span className="block truncate text-[15px] leading-tight">{t.detail}</span>}
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
