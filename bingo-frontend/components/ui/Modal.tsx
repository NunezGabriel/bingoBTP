"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { PixelIcon } from "@/components/pixel/Sprite";

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  wide?: boolean;
  dismissible?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, dismissible]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-night/80 p-3 sm:items-center"
      onClick={dismissible ? onClose : undefined}
      role="presentation"
    >
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className={`px-box px-pop max-h-[88dvh] w-full overflow-y-auto outline-none ${wide ? "max-w-2xl" : "max-w-md"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b-4 border-ink px-4 pb-3 pt-4">
          <div className="font-pixel text-[12px] leading-relaxed text-cream">{title}</div>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              className="-mr-1 -mt-1 p-2 text-muted hover:text-cream"
              aria-label="Cerrar"
            >
              <PixelIcon name="close" size={16} />
            </button>
          )}
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
