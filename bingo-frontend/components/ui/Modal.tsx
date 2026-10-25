"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";

export function Modal({
  open,
  onClose,
  title,
  children,
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
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
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, dismissible]);

  /**
   * El foco se pone UNA vez, al abrir.
   *
   * Estaba en el efecto de arriba, que depende de onClose. Como casi nadie
   * memoriza esa funcion, cualquier render del padre la cambiaba y el efecto
   * se repetia robandole el foco a lo que hubiera dentro. En el lobby, que se
   * repinta seis veces por segundo, eso cerraba el teclado del celular a cada
   * letra que escribias.
   */
  useEffect(() => {
    if (!open || !panel.current) return;
    // Si algo de dentro ya se llevo el foco (un input con autoFocus), se
    // respeta: robarselo dejaria al teclado del celular sin abrir.
    if (!panel.current.contains(document.activeElement)) panel.current.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-3 sm:items-center"
      onClick={dismissible ? onClose : undefined}
      role="presentation"
    >
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className="card pop max-h-[88dvh] w-full max-w-md overflow-y-auto outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-5">
          <div className="text-lg font-extrabold leading-tight">{title}</div>
          {dismissible && (
            <button type="button" onClick={onClose} className="-mr-1 -mt-1 p-2 text-muted" aria-label="Cerrar">
              <Icon name="close" size={18} />
            </button>
          )}
        </div>
        <div className="px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}
