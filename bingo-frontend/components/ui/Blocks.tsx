import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export function PageTitle({ title, subtitle, right }: { title: string; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[15px] text-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function Loading({ label = "Cargando" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-muted">
      <div className="flex gap-1.5" aria-hidden>
        {["#4285f4", "#ea4335", "#fbbc04", "#34a853"].map((color, i) => (
          <span
            key={color}
            className="blink block h-3 w-3 rounded-full"
            style={{ background: color, animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <span className="text-[15px] font-semibold">{label}...</span>
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card p-4 text-center">
      <p className="text-[17px] font-semibold">{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-sm mt-3" onClick={onRetry}>
          <Icon name="refresh" size={16} /> Reintentar
        </button>
      )}
    </div>
  );
}

export function Empty({ icon = "star", title, children }: { icon?: IconName; title: string; children?: ReactNode }) {
  return (
    <div className="card px-4 py-10 text-center">
      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-ink">
        <Icon name={icon} size={22} />
      </span>
      <p className="text-lg font-bold">{title}</p>
      {children && <p className="mt-2 text-[15px] text-muted">{children}</p>}
    </div>
  );
}

export function Pill({
  children,
  color,
  text,
  className = "",
}: {
  children: ReactNode;
  color?: string;
  text?: string;
  className?: string;
}) {
  return (
    <span className={`pill ${className}`} style={{ background: color, color: text }}>
      {children}
    </span>
  );
}

export function ProgressBar({ value, max, color = "#4285f4" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="bar" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <span style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}
