import { HOUSES } from "@/lib/sprites";
import type { HouseRow, LeaderboardRow } from "@/lib/types";
import { Avatar, LevelTag } from "@/components/pixel/Avatar";
import { PixelIcon } from "@/components/pixel/Sprite";

const PODIUM = ["#ffd23f", "#d3dbe6", "#d8894a"];

export function LeaderboardList({
  rows,
  highlightId,
  dense = false,
}: {
  rows: LeaderboardRow[];
  highlightId?: number;
  dense?: boolean;
}) {
  return (
    <ol className="flex flex-col">
      {rows.map((r) => {
        const me = r.player.id === highlightId;
        const podium = r.rank <= 3;
        return (
          <li
            key={r.player.id}
            className={`px-box flex items-center gap-3 ${dense ? "px-2 py-1" : "px-3 py-2"}`}
            style={{
              ["--box-bg" as string]: me ? "#3b3b8f" : "#1f1f45",
              ["--box-edge" as string]: me ? "#fbbc04" : "#14142b",
            }}
          >
            <span
              className="font-pixel w-8 text-center text-[13px]"
              style={{ color: podium ? PODIUM[r.rank - 1] : "#9f9fc7" }}
            >
              {podium ? <PixelIcon name="crown" size={16} className="mx-auto" /> : r.rank}
            </span>
            <Avatar cls={r.player.avatarClass} house={r.player.avatarHouse} tier={r.player.tier} size={dense ? 36 : 48} />
            <span className="min-w-0 flex-1">
              <span className="font-pixel block truncate text-[10px] text-cream">
                {r.player.nickname}
                {me ? " (tu)" : ""}
              </span>
              <span className="mt-1 flex items-center gap-2">
                <LevelTag level={r.player.level} />
                <span className="truncate text-[14px] text-muted">{r.player.title}</span>
              </span>
            </span>
            <span className="font-pixel text-[13px] text-gold">{r.points}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function HouseBars({ houses, large = false }: { houses: HouseRow[]; large?: boolean }) {
  const max = Math.max(1, ...houses.map((h) => h.points));
  return (
    <ul className="flex flex-col gap-2">
      {houses.map((h, i) => {
        const house = HOUSES[h.house];
        return (
          <li key={h.house}>
            <div className="flex items-baseline justify-between">
              <span className={`font-pixel ${large ? "text-[14px]" : "text-[10px]"}`} style={{ color: house.P }}>
                {i === 0 && h.points > 0 ? "★ " : ""}CASA {house.name.toUpperCase()}
              </span>
              <span className={`font-pixel text-cream ${large ? "text-[16px]" : "text-[11px]"}`}>
                {h.points}
                <span className="ml-2 text-muted" style={{ fontSize: large ? 11 : 8 }}>
                  {h.players} jug.
                </span>
              </span>
            </div>
            <div className={`mt-1 bg-ink p-[3px] ${large ? "h-7" : "h-4"}`}>
              <div
                className="h-full transition-[width] duration-500"
                style={{
                  width: `${(h.points / max) * 100}%`,
                  backgroundImage: `repeating-linear-gradient(90deg, ${house.P} 0, ${house.P} 8px, ${house.Q} 8px, ${house.Q} 10px)`,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
