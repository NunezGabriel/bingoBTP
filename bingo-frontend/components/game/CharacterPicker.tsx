"use client";

import { CLASSES, HOUSES, HOUSE_KEYS, type ClassKey, type HouseKey } from "@/lib/sprites";
import { unlockLevelOf } from "@/lib/progression";
import { PixelIcon, Sprite } from "@/components/pixel/Sprite";

export function ClassGrid({
  value,
  house,
  level = 1,
  onChange,
}: {
  value: ClassKey;
  house: HouseKey;
  level?: number;
  onChange: (cls: ClassKey) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-1" role="radiogroup" aria-label="Clase de personaje">
      {CLASSES.map((c) => {
        const locked = level < unlockLevelOf(c.key);
        const selected = value === c.key;
        return (
          <button
            key={c.key}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={locked ? `${c.name}, se desbloquea en nivel ${c.unlockLevel}` : c.name}
            disabled={locked}
            onClick={() => onChange(c.key)}
            className="px-box relative flex aspect-square items-center justify-center"
            style={{
              ["--box-bg" as string]: selected ? "#3b3b8f" : "#1f1f45",
              ["--box-edge" as string]: selected ? "#fbbc04" : "#14142b",
            }}
          >
            <span className={locked ? "opacity-25 grayscale" : ""}>
              <Sprite cls={c.key} house={house} size={44} />
            </span>
            {locked && (
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-gold">
                <PixelIcon name="lock" size={14} />
                <span className="font-pixel text-[7px]">NV {c.unlockLevel}</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Selector de casa. Con `counts` muestra cuantos miembros tiene cada casa en
 * el evento abierto: ayuda a que la gente se reparta y a armar equipos parejos.
 */
export function HousePicker({
  value,
  onChange,
  disabled = false,
  counts,
}: {
  value: HouseKey;
  onChange: (house: HouseKey) => void;
  disabled?: boolean;
  counts?: Partial<Record<HouseKey, number>>;
}) {
  return (
    <div className="grid grid-cols-4 gap-1" role="radiogroup" aria-label="Casa">
      {HOUSE_KEYS.map((key) => {
        const h = HOUSES[key];
        const selected = value === key;
        const text = key === "amarillo" ? "#14142b" : "#ffffff";
        const count = counts?.[key];
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={count === undefined ? h.name : `${h.name}, ${count} miembros`}
            disabled={disabled}
            onClick={() => onChange(key)}
            className="px-box flex flex-col items-center gap-1 py-3"
            style={{
              ["--box-bg" as string]: h.P,
              ["--box-edge" as string]: selected ? "#f7f3e8" : "#14142b",
              opacity: disabled && !selected ? 0.35 : 1,
            }}
          >
            <span className="font-pixel text-[8px]" style={{ color: text }}>
              {h.name}
            </span>
            {count !== undefined && (
              <span className="font-pixel text-[13px] leading-none" style={{ color: text }}>
                {count}
              </span>
            )}
            {selected ? (
              <PixelIcon name="check" size={14} className={key === "amarillo" ? "text-ink" : "text-white"} />
            ) : (
              count !== undefined && (
                <span className="text-[12px] leading-none" style={{ color: text }}>
                  {count === 1 ? "miembro" : "miembros"}
                </span>
              )
            )}
          </button>
        );
      })}
    </div>
  );
}
