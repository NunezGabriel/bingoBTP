/** El codigo del jugador en grande: se dicta o se muestra, sin camara. */
export function PlayerCode({ code, hint }: { code: string; hint?: string }) {
  const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
  return (
    <section className="card p-4 text-center" style={{ background: "#fbbc04" }}>
      <p className="text-[13px] font-extrabold uppercase tracking-wide">Tu codigo</p>
      <p className="mt-1 text-4xl font-black tracking-[0.18em]" aria-label={code.split("").join(" ")}>
        {spaced}
      </p>
      {hint && <p className="mt-2 text-[14px] font-medium leading-snug">{hint}</p>}
    </section>
  );
}
