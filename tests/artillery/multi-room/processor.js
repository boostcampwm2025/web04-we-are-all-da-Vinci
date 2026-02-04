require("dotenv").config();
const { createClient } = require("redis");
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

const ROOM_COUNT = parseInt(process.env.ROOM_COUNT ?? "1", 10);
const PLAYER_PER_ROOM = parseInt(process.env.PLAYER_PER_ROOM ?? "1", 10);

const RUN_ID = process.env.RUN_ID ?? `run_${Date.now()}`;
const REDIS_URL = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

const KEY_COUNTER = `test:${RUN_ID}:counter`;
const KEY_ROOMS = `test:${RUN_ID}:rooms`;

let redis; // 프로세스당 1개 클라이언트

async function getRedis() {
  if (redis) return redis;
  try {
    redis = createClient({ url: REDIS_URL });
    await redis.connect();
  } catch (err) {
    console.error("레디스 에러", err);
    process.exit(1);
  }

  return redis;
}

async function beforeAll(context, events) {
  try {
    const r = await getRedis();
    await r.del(KEY_ROOMS);
    await r.set(KEY_COUNTER, "0");
  } catch (err) {
    console.error("beforeAll 에러", err);
    process.exit(1);
  }
}

async function afterPostRoom(requestParams, response, context, events) {
  try {
    const r = await getRedis();
    const { roomId } = JSON.parse(response.body);
    await r.rPush(KEY_ROOMS, roomId);
  } catch (err) {
    console.error("afterPostRoom 에러", err);
    process.exit(1);
  }
}

async function getNextPlayerNumber() {
  const r = await getRedis();
  const n = await r.incr(KEY_COUNTER);
  return n - 1;
}

async function initUser(userContext, events, done) {
  const r = await getRedis();
  const playerNumber = await getNextPlayerNumber();
  const roomIndex = Math.floor(playerNumber / PLAYER_PER_ROOM) % ROOM_COUNT;

  // rooms list가 준비될 때까지(예: room 생성이 아직 진행 중)
  // -> LRANGE 또는 LINDEX 재시도
  let roomId = await r.lIndex(KEY_ROOMS, roomIndex);
  if (!roomId) {
    // 재시도
    for (let i = 0; i < 20 && !roomId; i++) {
      await new Promise((res) => setTimeout(res, 100));
      roomId = await r.lIndex(KEY_ROOMS, roomIndex);
    }
  }
  if (!roomId) {
    throw new Error(
      `roomId not ready. roomIndex=${roomIndex}, RUN_ID=${RUN_ID}`,
    );
  }

  userContext.vars.roomId = roomId;
  userContext.vars.playerNumber = playerNumber;
  userContext.vars.isFirstInRoom = playerNumber % PLAYER_PER_ROOM === 0;
  userContext.vars.nickname = `bot_${roomIndex}_${playerNumber}_${Date.now()}`;

  userContext.vars.strokes = DRAWING_DATA;
  userContext.vars.similarity = {
    similarity: Math.random() * 100,
    strokeCountSimilarity: 10,
    strokeMatchSimilarity: 10,
    shapeSimilarity: 10,
  };

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
  console.log(userContext.vars.roomId);
}

function updateScore(userContext, events, done) {
  userContext.vars.randomScore = Math.random() * 100;
  return done();
}

function waitAllPlayerReady(userContext, next) {
  const playerCount = userContext.vars.playerCount;
  const phase = userContext.vars.phase;
  return next(playerCount < PLAYER_PER_ROOM && phase === "WAITING");
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
  afterPostRoom,
  beforeAll,
};
