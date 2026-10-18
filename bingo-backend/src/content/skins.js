/**
 * Los personajes del lobby.
 *
 * Aqui solo viven el id, el nombre y la descripcion; el dibujo en pixeles esta
 * en el frontend (bingo-frontend/lib/sprites.ts), porque es lo que se pinta en
 * el canvas. El backend solo guarda cual eligio cada quien y valida que el id
 * exista: si alguien tiene guardado un personaje que ya no esta, se le vuelve
 * a preguntar.
 */
const SKINS = [
  {
    id: "dev",
    name: "Dev",
    detail: "Polera negra y jean: el uniforme.",
  },
  {
    id: "lead",
    name: "Tech lead",
    detail: "Quien revisa tus pull requests.",
  },
  {
    id: "mago",
    name: "Mago",
    detail: "Arregla bugs sin saber como.",
  },
  {
    id: "esqueleto",
    name: "Esqueleto",
    detail: "Tres sprints sin dormir.",
  },
  {
    id: "robot",
    name: "Bot",
    detail: "Hizo el deploy un viernes.",
  },
];

const IDS = new Set(SKINS.map((s) => s.id));

module.exports = {
  SKINS,
  /** Id valido o null: nunca se guarda ni se devuelve un personaje que no existe. */
  normalizeSkin: (value) => (IDS.has(String(value)) ? String(value) : null),
  defaultSkin: SKINS[0].id,
};
