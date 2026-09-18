/** El codigo del jugador en grande: se dicta o se lee, sin camara. */
export function PlayerCode({ code, hint, compact = false }: { code: string; hint?: string; compact?: boolean }) {
  const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;

  if (compact) {
    return (
      <p className="text-[16px] text-muted">
        Tu codigo: <span className="font-pixel text-[12px] tracking-[0.15em] text-gyellow">{spaced}</span>
      </p>
    );
  }

  return (
    <section className="px-box p-3 text-center" style={{ ["--box-bg" as string]: "#f7f3e8" }}>
      <p className="font-pixel text-[9px] text-ink">TU CODIGO</p>
      <p className="font-pixel mt-2 text-[30px] leading-none tracking-[0.15em] text-ink" aria-label={code.split("").join(" ")}>
        {spaced}
      </p>
      {hint && <p className="mt-2 text-[15px] leading-tight text-[#4a4a6a]">{hint}</p>}
    </section>
  );
}
