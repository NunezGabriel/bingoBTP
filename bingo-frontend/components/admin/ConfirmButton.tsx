"use client";

import { useState, type ReactNode } from "react";

/** Boton que pide confirmar con un segundo toque (sin dialogos del navegador). */
export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = "Confirmar?",
  className = "",
  disabled,
}: {
  onConfirm: () => void | Promise<void>;
  children: ReactNode;
  confirmLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  return (
    <button
      type="button"
      disabled={disabled}
      className={`btn ${armed ? "btn-red" : className}`}
      onClick={async () => {
        if (!armed) {
          setArmed(true);
          window.setTimeout(() => setArmed(false), 3500);
          return;
        }
        setArmed(false);
        await onConfirm();
      }}
    >
      {armed ? confirmLabel : children}
    </button>
  );
}
