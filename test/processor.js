require("dotenv").config();

/**
 * 상수 정의
 * .env 파일과 맞출 것!
 */
const DURATION = parseInt(process.env.DURATION ?? "2", 10);
const ARRIVAL_RATE = parseInt(process.env.ARRIVAL_RATE ?? "1", 10);

const TOTAL_PLAYER = DURATION * ARRIVAL_RATE;

const DRAWING_DATA = [
  {
    points: [
      [48, 31],
      [92, 181],
    ],
    color: [0, 0, 0],
  },
  {
    points: [
      [198, 201, 201],
      [76, 100, 167],
    ],
    color: [0, 0, 0],
  },
  {
    points: [
      [0, 185, 251, 190, 115, 103, 78, 36, 12, 3],
      [82, 83, 80, 39, 8, 10, 25, 58, 70, 82],
    ],
    color: [239, 68, 68],
  },
  {
    points: [
      [101, 103, 152, 152, 150, 94],
      [99, 149, 150, 107, 99, 97],
    ],
    color: [239, 68, 68],
  },
  {
    points: [
      [125, 124],
      [98, 149],
    ],
    color: [0, 0, 0],
  },
  {
    points: [
      [101, 166],
      [133, 131],
    ],
    color: [0, 0, 0],
  },
  {
    points: [
      [97, 105, 111, 125, 130, 131, 94],
      [60, 37, 34, 42, 51, 65, 60],
    ],
    color: [59, 130, 246],
  },
  {
    points: [
      [168, 168],
      [3, 27],
    ],
    color: [0, 0, 0],
  },
  {
    points: [
      [184, 189],
      [4, 41],
    ],
    color: [0, 0, 0],
  },
  {
    points: [
      [168, 169, 184],
      [0, 3, 5],
    ],
    color: [0, 0, 0],
  },
  {
    points: [
      [34, 117, 135, 210, 208],
      [186, 189, 185, 184, 154],
    ],
    color: [0, 0, 0],
  },
  {
    points: [
      [24, 25, 11, 12, 25, 33, 36, 41, 37, 39, 41, 41, 48],
      [186, 174, 155, 163, 181, 155, 154, 171, 170, 177, 175, 150, 181],
    ],
    color: [34, 197, 94],
  },
  {
    points: [
      [204, 211, 240, 235, 231, 242, 231, 255, 250, 246, 237],
      [181, 176, 138, 149, 173, 156, 182, 175, 178, 190, 196],
    ],
    color: [34, 197, 94],
  },
];

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
