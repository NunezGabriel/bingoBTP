const express = require("express");
const { toInt, conflict } = require("../lib/http");
const { resolvePlayerCode } = require("../lib/playerCode");
const { requirePlayer, requireLiveEvent } = require("../middleware/auth");
const games = require("../services/games");
const bingo = require("../services/bingo");

const router = express.Router();
router.use(requirePlayer, requireLiveEvent);

/** El juego en marcha y, si es bingo activo, la cartilla del jugador y el podio. */
router.get("/current", async (req, res) => {
  const session = await games.runningSession(req.event.id);
  if (!session) return res.json({ game: null, board: null, winners: [] });

  let board = null;
  let winners = [];
  if (session.type === "BINGO" && session.status === "ACTIVE") {
    const [mine, top] = await Promise.all([
      bingo.getOrCreateBoard(session, req.player.id),
      bingo.podium(session.id),
    ]);
    board = bingo.boardView(mine, session);
    winners = top;
  }
  res.json({ game: games.sessionView(session), board, winners });
});

router.post("/bingo/sign", async (req, res) => {
  const session = await games.runningSession(req.event.id);
  if (!session || session.type !== "BINGO") throw conflict("No hay un bingo en curso");

  const position = toInt(req.body?.position, "position", { min: 0, max: bingo.BOARD_SIZE - 1 });
  const signer = await resolvePlayerCode(req, req.body?.code);
  res.json(await bingo.signCell(req.event, session, req.player, position, signer));
});

module.exports = router;
