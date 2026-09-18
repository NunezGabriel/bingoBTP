import type { ReactNode } from "react";
import { PixelIcon } from "@/components/pixel/Sprite";
import type { IconName } from "@/components/pixel/icons";

export function PageTitle({
  icon,
  title,
  subtitle,
  right,
}: {
  icon?: IconName;
  title: string;
  subtitle?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3 px-1">
      <div className="min-w-0">
        <h1 className="font-pixel flex items-center gap-2 text-[15px] text-cream">
          {icon && <PixelIcon name={icon} size={18} className="text-gyellow" />}
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-[15px] text-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function Loading({ label = "Cargando" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted">
      <div className="flex gap-1.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="px-blink block h-3 w-3 bg-gyellow"
            style={{ animationDelay: `${i * 0.33}s` }}
          />
        ))}
      </div>
      <span className="font-pixel text-[10px]">{label}...</span>
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="px-box px-4 py-4 text-center" style={{ ["--box-bg" as string]: "#3a1830" }}>
      <p className="text-[17px] text-cream">{message}</p>
      {onRetry && (
        <button type="button" className="px-btn px-btn-dark px-btn-sm mt-3" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}

export function Empty({ icon = "star", title, children }: { icon?: IconName; title: string; children?: ReactNode }) {
  return (
    <div className="px-box px-4 py-8 text-center">
      <PixelIcon name={icon} size={28} className="mx-auto text-muted" />
      <p className="font-pixel mt-3 text-[11px] text-cream">{title}</p>
      {children && <div className="mt-2 text-[16px] text-muted">{children}</div>}
    </div>
  );
}

export function Pill({
  children,
  color = "#2a2a5a",
  text = "#f7f3e8",
  className = "",
}: {
  children: ReactNode;
  color?: string;
  text?: string;
  className?: string;
}) {
  return (
    <span
      className={`font-pixel inline-flex items-center gap-1 px-1.5 pb-[3px] pt-[5px] text-[8px] leading-none ${className}`}
      style={{ background: color, color: text }}
    >
      {children}
    </span>
  );
}

export function ProgressBar({ value, max, color }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="px-bar" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <span style={{ width: `${pct}%`, ["--bar" as string]: color }} />
    </div>
  );
}
