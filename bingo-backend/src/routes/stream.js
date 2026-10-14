const express = require("express");
const hub = require("../realtime/hub");
const { readAdmin } = require("../lib/session");

const router = express.Router();

/**
 * Un solo stream por cliente. Los canales dependen de quien se conecta:
 * - jugador: "all" + su canal personal
 * - panel admin (cookie de admin): + "admin"
 * - pantalla gigante (?screen=1): "all" + "screen", sin sesion
 */
router.get("/", (req, res) => {
  const channels = ["all"];
  if (req.query.screen === "1") channels.push("screen");
  if (req.player) channels.push(`player:${req.player.id}`);
  if (readAdmin(req)) channels.push("admin");

  if (channels.length === 1 && !req.player) {
    return res.status(401).json({ error: "Inicia sesion para continuar" });
  }
  hub.subscribe(req, res, channels);
});

module.exports = router;
