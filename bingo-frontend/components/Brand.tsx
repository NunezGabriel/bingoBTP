/**
 * El logo de GDG: los signos < > hechos con cuatro barras redondeadas en los
 * colores de Google. El orden de dibujo importa: en cada vertice la barra de
 * abajo tapa a la de arriba, como en el logo original.
 */
export function GdgMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size * 1.6}
      height={size}
      viewBox="0 0 800 500"
      aria-hidden
      className="shrink-0"
      fill="none"
      strokeWidth="118"
      strokeLinecap="round"
    >
      <path d="M306 108 86 236" stroke="#ea4335" />
      <path d="M86 264 306 392" stroke="#4285f4" />
      <path d="M714 264 494 392" stroke="#fbbc04" />
      <path d="M494 108 714 236" stroke="#1e8e3e" />
    </svg>
  );
}

export function GdgLogo({ size = 22 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <GdgMark size={size} />
      <span className="font-bold tracking-tight" style={{ fontSize: size * 0.85 }}>
        GDG Arequipa
      </span>
    </span>
  );
}

/**
 * Titulo con llaves de colores, como el afiche del DevFest:  { Bingo }
 */
export function BingoWordmark({ size = 56, subtitle }: { size?: number; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center" style={{ gap: size * 0.1 }}>
        <span className="font-black leading-none text-gblue" style={{ fontSize: size * 1.5 }}>
          {"{"}
        </span>
        <span className="font-black leading-none tracking-tight" style={{ fontSize: size }}>
          Bingo
        </span>
        <span className="font-black leading-none text-ggreen" style={{ fontSize: size * 1.5 }}>
          {"}"}
        </span>
      </div>
      {subtitle && (
        <span
          className="card-flat mt-2 px-4 py-1 font-bold"
          style={{ fontSize: Math.max(13, size * 0.3), borderRadius: 999 }}
        >
          {subtitle}
        </span>
      )}
    </div>
  );
}

/** Formas geometricas del afiche, para decorar esquinas. */
export function Sparkles({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none select-none ${className}`} aria-hidden>
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
        <path d="M18 60h44M40 38v44M24 44l32 32M56 44 24 76" stroke="#191919" strokeWidth="7" strokeLinecap="round" />
        <path d="M78 22h30v30H78z" fill="#ff5fa2" stroke="#191919" strokeWidth="4" transform="rotate(12 93 37)" />
        <circle cx="96" cy="92" r="16" fill="#34a853" stroke="#191919" strokeWidth="4" />
      </svg>
    </div>
  );
}
