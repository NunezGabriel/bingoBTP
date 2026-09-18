"use client";

import { useState, type ReactNode } from "react";

export function Card({
  title,
  children,
  right,
  className = "",
  color,
}: {
  title?: ReactNode;
  children: ReactNode;
  right?: ReactNode;
  className?: string;
  color?: string;
}) {
  return (
    <section className={`px-box p-4 ${className}`} style={color ? { ["--box-bg" as string]: color } : undefined}>
      {(title || right) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="font-pixel text-[11px] text-cream">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`px-input !text-[17px] ${props.className ?? ""}`} />;
}

/** Boton que pide confirmar con un segundo toque (sin dialogos del navegador). */
export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = "Confirmar?",
  className = "px-btn-red",
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
      className={`px-btn ${armed ? "px-btn-red" : className}`}
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
