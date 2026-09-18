const express = require("express");
const hub = require("../realtime/hub");

const router = express.Router();

/**
 * Un solo stream por cliente. Los canales dependen de quien se conecta:
 * - jugador: "all" + su canal personal (+ staff/admin segun rol)
 * - pantalla gigante (?screen=1): "all" + "screen", sin necesidad de sesion
 */
router.get("/", (req, res) => {
  const channels = ["all"];

  if (req.query.screen === "1") channels.push("screen");

  if (req.player) {
    channels.push(`player:${req.player.id}`);
    if (req.player.role === "STAFF" || req.player.role === "ADMIN") channels.push("staff");
    if (req.player.role === "ADMIN") channels.push("admin");
  } else if (req.query.screen !== "1") {
    return res.status(401).json({ error: "Inicia sesion para continuar" });
  }

  hub.subscribe(req, res, channels);
});

module.exports = router;
