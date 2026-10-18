const express = require("express");
const { conflict, toText } = require("../../lib/http");
const { getLiveEvent } = require("../../services/events");
const missions = require("../../services/missions");

const router = express.Router();

/** Las cuatro misiones, para que el escaner sepa cual esta validando. */
router.get("/", (req, res) => {
  res.json({
    missions: missions.missions.map((m) => ({
      id: m.id,
      title: m.title,
      detail: m.detail,
      hint: m.hint,
      icon: m.icon,
      points: m.points,
    })),
  });
});

/**
 * Validar una mision: el admin elige cual esta validando y escanea el QR (o
 * escribe el codigo de 6 letras si la camara no esta disponible, que es lo que
 * pasa si la app se sirve por HTTP).
 */
router.post("/validate", async (req, res) => {
  const event = await getLiveEvent();
  if (!event) throw conflict("Abre un evento antes de validar misiones");

  const code = toText(req.body?.code, "codigo", { min: 4, max: 40 });
  const missionId = toText(req.body?.missionId, "mision", { min: 1, max: 40 });

  const result = await missions.validate({
    eventId: event.id,
    // El QR lleva el codigo tal cual, pero puede venir como URL completa.
    code: code.split("/").pop(),
    missionId,
    adminId: req.player.id,
  });
  res.json(result);
});

/** Para la premiacion: quien completo la tarjeta y como va cada mision. */
router.get("/report", async (req, res) => {
  const event = await getLiveEvent();
  if (!event) return res.json({ completas: [], people: [], porMision: [], total: 0 });
  res.json(await missions.report(event.id));
});

module.exports = router;
