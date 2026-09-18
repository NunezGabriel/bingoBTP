/**
 * Progresion del personaje. Espejo exacto de bingo-frontend/lib/progression.ts:
 * si cambias una curva aqui, cambiala alla.
 */

const MAX_LEVEL = 30;

/** XP total necesaria para ALCANZAR un nivel. L2=100, L3=300, L5=1000, L10=4500. */
function xpForLevel(level) {
  return 50 * level * (level - 1);
}

function levelFromXp(xp) {
  let level = 1;
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level += 1;
  return level;
}

const TIERS = [
  { minLevel: 1, key: "madera", name: "Madera" },
  { minLevel: 3, key: "bronce", name: "Bronce" },
  { minLevel: 5, key: "plata", name: "Plata" },
  { minLevel: 7, key: "oro", name: "Oro" },
  { minLevel: 9, key: "diamante", name: "Diamante" },
  { minLevel: 12, key: "mitico", name: "Mitico" },
];

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

function tierForLevel(level) {
  let tier = TIERS[0];
  for (const t of TIERS) if (level >= t.minLevel) tier = t;
  return tier;
}

function titleForLevel(level) {
  return TITLES[Math.min(level, TITLES.length) - 1];
}

/** Clases desbloqueables. El resto esta disponible desde el nivel 1. */
const CLASS_UNLOCKS = { dragon: 6, misti: 10 };
const CLASSES = [
  "esqueleto",
  "mago",
  "caballero",
  "robot",
  "ninja",
  "fantasma",
  "slime",
  "astronauta",
  "dragon",
  "misti",
];
const HOUSES = ["azul", "rojo", "amarillo", "verde"];

function isClassUnlocked(avatarClass, level) {
  return level >= (CLASS_UNLOCKS[avatarClass] ?? 1);
}

function progressFor(xp) {
  const level = levelFromXp(xp);
  const tier = tierForLevel(level);
  return {
    xp,
    level,
    levelXp: xpForLevel(level),
    nextLevelXp: level >= MAX_LEVEL ? null : xpForLevel(level + 1),
    tier: tier.key,
    tierName: tier.name,
    title: titleForLevel(level),
  };
}

module.exports = {
  MAX_LEVEL,
  CLASSES,
  HOUSES,
  CLASS_UNLOCKS,
  xpForLevel,
  levelFromXp,
  tierForLevel,
  isClassUnlocked,
  progressFor,
};
