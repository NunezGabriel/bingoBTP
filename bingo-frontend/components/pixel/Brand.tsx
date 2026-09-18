/** Nombre del producto en un solo lugar: cambialo aqui si renombras la plataforma. */
export const BRAND = {
  name: "MISTI QUEST",
  community: "GDG Arequipa",
};

const VOLCANO = [
  "..............ROR...............",
  "...............Y................",
  "..............WWW...............",
  ".............WWWWW..............",
  "............WWWWWWW.............",
  "...........GWWGWWWGW............",
  "..........GGGGWGGGGGG...........",
  ".........GGGGGGGGGGGGG..........",
  "........GGGgGGGGGGGgGGG.........",
  ".......GGGGGGGGGGGGGGGGG........",
  "......GGGGGgGGGGGGgGGGGGG.......",
  ".....GGGGGGGGGGGGGGGGGGGGG......",
  "....GGGGGGGGGgGGGGGGGGGGGGG.....",
  "...GGgGGGGGGGGGGGGGGGGGGgGGG....",
  "..GGGGGGGGGGGGGGGGGGGGGGGGGGG...",
  ".GGGGGGGGGGGGGGGGGGGGGGGGGGGGG..",
];

const VOLCANO_COLORS: Record<string, string> = {
  W: "#f7f3e8",
  G: "#4b3f7c",
  g: "#3a3066",
  R: "#ea4335",
  O: "#ff8a1f",
  Y: "#fbbc04",
};

/** Silueta pixel del volcan Misti. */
export function Volcano({ width = 320, className = "" }: { width?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 32 16"
      width={width}
      height={width / 2}
      shapeRendering="crispEdges"
      aria-hidden
      className={className}
    >
      {VOLCANO.flatMap((row, y) => {
        const out = [];
        let x = 0;
        while (x < row.length) {
          const ch = row[x];
          if (ch === ".") {
            x += 1;
            continue;
          }
          let end = x + 1;
          while (end < row.length && row[end] === ch) end += 1;
          out.push(<rect key={`${x}-${y}`} x={x} y={y} width={end - x} height={1} fill={VOLCANO_COLORS[ch]} />);
          x = end;
        }
        return out;
      })}
    </svg>
  );
}

/** Los corchetes "< >" de GDG en pixel, con los colores de Google. */
export function GdgBrackets({ size = 22 }: { size?: number }) {
  const left = ["...RR", "..RR.", ".RR..", "BB...", ".BB..", "..BB.", "...BB"];
  const right = ["GG...", ".GG..", "..GG.", "...YY", "..YY.", ".YY..", "YY..."];
  const colors: Record<string, string> = { B: "#4285f4", R: "#ea4335", G: "#34a853", Y: "#fbbc04" };
  const draw = (rows: string[], dx: number) =>
    rows.flatMap((row, y) =>
      [...row].map((ch, x) =>
        ch === "." ? null : <rect key={`${dx}-${x}-${y}`} x={x + dx} y={y} width={1} height={1} fill={colors[ch]} />,
      ),
    );
  return (
    <svg viewBox="0 0 12 7" width={(size * 12) / 7} height={size} shapeRendering="crispEdges" aria-hidden>
      {draw(left, 0)}
      {draw(right, 7)}
    </svg>
  );
}

/** Logotipo: titulo con sombra pixel multicolor. */
export function Logo({ size = "lg" }: { size?: "sm" | "lg" }) {
  const big = size === "lg";
  return (
    <div className="flex flex-col items-center text-center">
      <h1
        className={`font-pixel text-cream ${big ? "text-[26px] leading-[1.35] sm:text-[34px]" : "text-[14px]"}`}
        style={{
          textShadow: big
            ? "3px 3px 0 #ea4335, 6px 6px 0 #14142b"
            : "2px 2px 0 #ea4335, 3px 3px 0 #14142b",
        }}
      >
        {BRAND.name}
      </h1>
      <div className={`mt-3 flex items-center gap-2 ${big ? "" : "mt-1"}`}>
        <GdgBrackets size={big ? 14 : 9} />
        <span className={`font-pixel text-muted ${big ? "text-[10px]" : "text-[7px]"}`}>
          {BRAND.community.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
