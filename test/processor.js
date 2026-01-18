require("dotenv").config();

/**
 * 상수 정의
 * .env 파일과 맞출 것!
 */
const DURATION = parseInt(process.env.DURATION ?? "2", 10);
const ARRIVAL_RATE = parseInt(process.env.ARRIVAL_RATE ?? "1", 10);

const TOTAL_PLAYER = DURATION * ARRIVAL_RATE;

const DRAWING_DATA = {
  points: [
    [
      90, 84, 70, 39, 27, 23, 1, 0, 4, 41, 57, 102, 133, 147, 176, 213, 231,
      242, 246, 245, 232, 214, 191, 160, 122, 94, 90, 88,
    ],
    [
      73, 61, 56, 56, 62, 64, 124, 174, 184, 240, 248, 248, 255, 255, 241, 219,
      193, 166, 149, 124, 97, 75, 62, 60, 80, 78, 75, 69,
    ],
  ],
  color: [239, 68, 68],
};

/**
 * 테스트 함수
 */

function initUser(userContext, events, done) {
  const vu = userContext.vars.__vu ?? Math.floor(Math.random() * 100000);
  userContext.vars.nickname = `bot_${vu}_${Date.now()}`;

  userContext.vars.strokes = DRAWING_DATA;
  userContext.vars.similarity = Math.random() * 100;

  userContext.vars.timeLeft = parseInt(process.env.DRAWING_TIME || "40", 10);
  userContext.vars.playerCount = 0;
  userContext.vars.phase = "WAITING";

  const socket = userContext.sockets[""];

  socket.on("room:metadata", async (response) => {
    const { players, phase } = response;

    userContext.vars.phase = phase;
    userContext.vars.playerCount = players?.length ?? 0;

    const isJoined = userContext.vars.isJoined;
    if (isJoined) return;
    if (players.length === 1 && phase === "WAITING") {
      console.log(`set host ${userContext.vars.nickname}, ${phase}`);
      userContext.vars.isHost = true;
      userContext.vars.startGame = "room:start";
    } else {
      userContext.vars.isHost = false;
      userContext.vars.startGame = "foo:bar";
    }

    userContext.vars.isJoined = true;
  });

  socket.on("room:timer", async (response) => {
    const { timeLeft } = response;
    if (userContext.vars.phase !== "DRAWING") return;
    userContext.vars.timeLeft = timeLeft;
  });

  return done();
}

function updateScore(userContext, events, done) {
  userContext.vars.randomScore = Math.random() * 100;
  return done();
}

function waitAllPlayerReady(userContext, next) {
  const playerCount = userContext.vars.playerCount;
  const phase = userContext.vars.phase;
  return next(playerCount < TOTAL_PLAYER && phase === "WAITING");
}

function waitDrawingPhase(userContext, next) {
  const phase = userContext.vars.phase;

  return next(phase === "WAITING" || phase === "PROMPT");
}

function waitRoundEnd(userContext, next) {
  const timeLeft = userContext.vars.timeLeft;
  return next(userContext.vars.phase === "DRAWING" && timeLeft && timeLeft > 0);
}

module.exports = {
  initUser,
  updateScore,
  waitAllPlayerReady,
  waitDrawingPhase,
  waitRoundEnd,
};
