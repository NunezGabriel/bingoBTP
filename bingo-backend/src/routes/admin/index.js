const express = require("express");
const { requireRole } = require("../../middleware/auth");

/** Panel admin: eventos, juego y usuarios. Nada mas. */
const router = express.Router();
router.use(requireRole("ADMIN"));

router.use("/events", require("./events"));
router.use("/game", require("./game"));
router.use("/users", require("./users"));

module.exports = router;
