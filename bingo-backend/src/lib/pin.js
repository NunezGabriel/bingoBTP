const crypto = require("node:crypto");
const { promisify } = require("node:util");

const scrypt = promisify(crypto.scrypt);
const KEY_LEN = 32;
// N=2^14 tarda ~50ms: suficiente para frenar fuerza bruta sin saturar el
// servidor cuando cientos de personas se registran a la vez en la entrada.
const PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

async function hashPin(pin) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(String(pin), salt, KEY_LEN, PARAMS);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

async function verifyPin(pin, stored) {
  if (typeof stored !== "string") return false;
  const [scheme, saltB64, keyB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const actual = await scrypt(
    String(pin),
    Buffer.from(saltB64, "base64"),
    expected.length,
    PARAMS,
  );
  return crypto.timingSafeEqual(expected, actual);
}

function isValidPin(pin) {
  return typeof pin === "string" && /^\d{4,8}$/.test(pin);
}

module.exports = { hashPin, verifyPin, isValidPin };
