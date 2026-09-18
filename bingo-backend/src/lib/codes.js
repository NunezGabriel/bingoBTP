const crypto = require("node:crypto");

// Sin I, O, 0 ni 1: se confunden al leerlos en voz alta o en una pantalla.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomFrom(alphabet, length) {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

const CODE_LENGTH = { player: 6 };

const newPlayerCode = () => randomFrom(ALPHABET, CODE_LENGTH.player);

/**
 * Normaliza el codigo que alguien escribio: acepta espacios, guiones y
 * minusculas ("ab-12 cd" -> "AB12CD").
 */
function normalizeCode(input) {
  if (typeof input !== "string") return "";
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

module.exports = {
  CODE_LENGTH,
  newPlayerCode,
  normalizeCode,
  shuffle,
};
