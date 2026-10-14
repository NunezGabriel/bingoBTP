const crypto = require("node:crypto");
const express = require("express");
const config = require("../../config");
const rateLimit = require("../../lib/rateLimit");
const { issueAdmin, clearAdmin, readAdmin } = require("../../lib/session");
const { badRequest, tooMany, unauthorized } = require("../../lib/http");
const hub = require("../../realtime/hub");
const { requireAdmin } = require("../../middleware/auth");
const { getLiveEvent, eventView, countPlayers } = require("../../services/events");
const leaderboard = require("../../services/leaderboard");
const rounds = require("../../services/rounds");
const cards = require("../../services/cards");

const router = express.Router();

/** Comparacion en tiempo constante: no filtra el codigo por cuanto tarda. */
function sameCode(a, b) {
  const x = crypto.createHash("sha256").update(a).digest();
  const y = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(x, y);
}

/** Entrar al panel: solo el codigo del evento. */
router.post("/login", (req, res) => {
  const limit = rateLimit.hit(`admin:${req.ip}`, 10, 10 * 60_000);
  if (!limit.ok) throw tooMany("Demasiados intentos. Espera unos minutos", limit.retryAfterMs);

  const code = String(req.body?.code ?? "").trim();
  if (!config.adminCode) throw badRequest("Falta configurar ADMIN_CODE en el servidor");
  if (!code || !sameCode(code, config.adminCode)) throw unauthorized("Codigo incorrecto");

  rateLimit.reset(`admin:${req.ip}`);
  issueAdmin(res);
  res.json({ ok: true });
});

router.post("/logout", (req, res) => {
  clearAdmin(res);
  res.json({ ok: true });
});

router.get("/session", (req, res) => {
  res.json({ admin: readAdmin(req) });
});

router.use(requireAdmin);

/** Todo lo que muestra la pantalla principal del panel, en una sola llamada. */
router.get("/overview", async (req, res) => {
  const event = await getLiveEvent();
  if (!event) return res.json({ event: null, players: 0, connected: hub.stats().connections });

  const [players, round, top] = await Promise.all([
    countPlayers(event.id),
    rounds.currentRound(event.id),
    leaderboard.topPlayers(event.id, 10),
  ]);

  res.json({
    event: eventView(event),
    players,
    connected: hub.stats().connections,
    top,
    round: round ? { ...rounds.roundView(round), progress: await cards.results(round.id) } : null,
    lastRound: round ? null : await rounds.lastEnded(event.id),
  });
});

router.use("/events", require("./events"));
router.use("/rounds", require("./rounds"));
router.use("/players", require("./players"));

module.exports = router;
