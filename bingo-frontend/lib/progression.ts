/**
 * Espejo de bingo-backend/src/lib/progression.js.
 * Si cambias una curva o un titulo alla, cambialo aqui.
 */
import type { ClassKey } from "./sprites";

export type TierKey = "madera" | "bronce" | "plata" | "oro" | "diamante" | "mitico";

export const MAX_LEVEL = 30;

export function xpForLevel(level: number) {
  return 50 * level * (level - 1);
}

export function levelFromXp(xp: number) {
  let level = 1;
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level += 1;
  return level;
}

export const TIERS: { minLevel: number; key: TierKey; name: string }[] = [
  { minLevel: 1, key: "madera", name: "Madera" },
  { minLevel: 3, key: "bronce", name: "Bronce" },
  { minLevel: 5, key: "plata", name: "Plata" },
  { minLevel: 7, key: "oro", name: "Oro" },
  { minLevel: 9, key: "diamante", name: "Diamante" },
  { minLevel: 12, key: "mitico", name: "Mitico" },
];

/** Color del aura y de la medalla por rango. */
export const TIER_STYLE: Record<
  TierKey,
  { aura: string | null; medal: string; medalShade: string; label: string }
> = {
  madera: { aura: null, medal: "#9a6334", medalShade: "#5e3a1c", label: "Madera" },
  bronce: { aura: "#34a853", medal: "#d8894a", medalShade: "#8f5226", label: "Bronce" },
  plata: { aura: "#4285f4", medal: "#d3dbe6", medalShade: "#8391a6", label: "Plata" },
  oro: { aura: "#a45cff", medal: "#ffd23f", medalShade: "#c99a14", label: "Oro" },
  diamante: { aura: "#ffd23f", medal: "#8ff5ff", medalShade: "#3fb2c9", label: "Diamante" },
  mitico: { aura: "rainbow", medal: "#ffffff", medalShade: "#c7c7d9", label: "Mitico" },
};

const TITLES = [
  "Hola Mundo",
  "Copy-Paster",
  "Junior",
  "Debugger",
  "Commit Master",
  "Full Stack",
  "Senior",
  "Tech Lead",
  "Arquitecto",
  "Leyenda del Misti",
  "Guardian del Codigo",
  "Mitico",
];

export function tierForLevel(level: number) {
  let tier = TIERS[0];
  for (const t of TIERS) if (level >= t.minLevel) tier = t;
  return tier;
}

export function titleForLevel(level: number) {
  return TITLES[Math.min(level, TITLES.length) - 1];
}

export const CLASS_UNLOCKS: Partial<Record<ClassKey, number>> = { dragon: 6, misti: 10 };

export function unlockLevelOf(cls: ClassKey) {
  return CLASS_UNLOCKS[cls] ?? 1;
}

/** Proxima recompensa visible, para motivar: nueva aura o clase legendaria. */
export function nextMilestone(level: number): string | null {
  const nextTier = TIERS.find((t) => t.minLevel > level);
  const nextClass = Object.entries(CLASS_UNLOCKS)
    .filter(([, lvl]) => (lvl ?? 0) > level)
    .sort((a, b) => (a[1] ?? 0) - (b[1] ?? 0))[0];

  const options: [number, string][] = [];
  if (nextTier) options.push([nextTier.minLevel, `aura ${nextTier.name}`]);
  if (nextClass) options.push([nextClass[1] ?? 0, `clase ${nextClass[0]}`]);
  options.sort((a, b) => a[0] - b[0]);
  return options[0] ? `Nv ${options[0][0]}: ${options[0][1]}` : null;
}
