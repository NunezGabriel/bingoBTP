type IoBadgeProps = {
  /** Alto base del bloque I/O en px; el resto escala en proporcion. */
  size?: number;
  className?: string;
};

/**
 * Lockup "I/O Extended" del evento: bloque oscuro con la barra (I) y el
 * anillo (O) en blanco, seguido de la pastilla "Extended".
 */
const IoBadge = ({ size = 44, className = "" }: IoBadgeProps) => {
  const ring = Math.round(size * 0.52);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span
        className="flex items-center justify-center gap-[0.32em] rounded-2xl bg-[#1f1f1f] px-3"
        style={{ height: size }}
      >
        <span
          className="rounded-[3px] bg-white"
          style={{ height: ring, width: Math.max(3, Math.round(size * 0.13)) }}
          aria-hidden
        />
        <span
          className="rounded-full bg-white"
          style={{ height: ring, width: ring }}
          aria-hidden
        />
      </span>
      <span
        className="font-display flex items-center rounded-full bg-[#1f1f1f] px-3 font-semibold text-white"
        style={{ height: size * 0.62, fontSize: size * 0.28 }}
      >
        Extended
      </span>
    </div>
  );
};

export default IoBadge;
