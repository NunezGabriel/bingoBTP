/**
 * Los personajes del lobby.
 *
 * Aqui solo viven el id, el nombre y los colores; el dibujo en pixeles esta
 * en el frontend (bingo-frontend/lib/sprites.ts), porque es lo que se pinta
 * en el canvas. El backend solo guarda cual eligio cada quien y valida que
 * el id exista.
 */
const SKINS = [
  {
    id: "characato",
    name: "Characato",
    detail: "Con sombrero arequipeno y poncho.",
  },
  {
    id: "rocoto",
    name: "Rocoto relleno",
    detail: "Picante, como debe ser.",
  },
  {
    id: "toro",
    name: "Toro",
    detail: "El de las peleas de agosto.",
  },
  {
    id: "misti",
    name: "Misti",
    detail: "El volcan, con su nieve y su mal genio.",
  },
  {
    id: "alpaca",
    name: "Alpaca",
    detail: "Con chullo, mirando feo.",
  },
];

const IDS = new Set(SKINS.map((s) => s.id));

module.exports = {
  SKINS,
  /** Id valido o null: nunca se guarda un personaje que no existe. */
  normalizeSkin: (value) => (IDS.has(String(value)) ? String(value) : null),
  defaultSkin: SKINS[0].id,
};
