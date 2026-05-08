import http from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const STAGES = [
  { duration: "1m", target: 20 },
  { duration: "1m", target: 50 },
  { duration: "1m", target: 70 },
  { duration: "1m", target: 90 },
  { duration: "1m", target: 100 },
  { duration: "2m", target: 100 },
  { duration: "1m", target: 0 },
];

const MAX_VUS = Math.max(...STAGES.map((stage) => stage.target));

export const options = {
  scenarios: {
    memory_probe: {
      executor: "ramping-vus",
      stages: STAGES,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500", "p(99)<1500"],
    "http_req_duration{api:myDrawings}": ["p(95)<500"],
    "http_req_duration{api:podium}": ["p(95)<500"],
    "http_req_duration{api:prompt}": ["p(95)<500"],
    "http_req_duration{api:strokes}": ["p(95)<300"],
    "http_req_duration{api:submit}": ["p(95)<1000"],
    "http_req_duration{api:myRanking}": ["p(95)<500"],
    "http_req_duration{api:rankings}": ["p(95)<500"],
  },
};

const users = new SharedArray("users", function () {
  return JSON.parse(open("../tokens.json"));
});

const getUser = () => {
  const index = (__VU - 1 + __ITER * MAX_VUS) % users.length;
  return users[index];
};

const authHeaders = (user) => {
  return {
    Authorization: `Bearer ${user.token}`,
    "Content-Type": "application/json",
  };
};

const randomBetween = (min, max) => {
  return Math.random() * (max - min) + min;
};

const sendStroke = ({ user, strokesPayload }) => {
  const res = http.post(`${BASE_URL}/strokes`, strokesPayload, {
    headers: authHeaders(user),
    tags: { api: "strokes" },
  });

  check(res, {
    "stroke success": (r) => r.status === 200 || r.status === 201,
  });

  return res;
};

export default function () {
  const user = getUser();

  const myDrawingRes = http.get(`${BASE_URL}/drawing/me`, {
    headers: authHeaders(user),
    tags: { api: "myDrawings" },
  });

  check(myDrawingRes, {
    "my drawing success": (r) => r.status === 200,
  });

  const podiumRes = http.get(`${BASE_URL}/rankings/podium`, {
    headers: authHeaders(user),
    tags: { api: "podium" },
  });
  check(podiumRes, {
    "podium success": (r) => r.status === 200,
  });

  const promptRes = http.get(`${BASE_URL}/prompt`, {
    headers: authHeaders(user),
    tags: { api: "prompt" },
  });
  check(promptRes, {
    "prompt success": (r) => r.status === 200,
  });

  const promptJson = promptRes.json();

  const strokes = promptJson.strokes;

  const strokesPayload = JSON.stringify({ strokes });

  for (let i = 0; i < 20; ++i) {
    sendStroke({
      user,
      strokesPayload,
    });

    sleep(randomBetween(0.4, 1.0));
  }

  const submitRes = http.post(`${BASE_URL}/drawing`, strokesPayload, {
    headers: authHeaders(user),
    tags: { api: "submit" },
  });

  check(submitRes, {
    "submit success": (r) => r.status === 201 || r.status === 200,
  });

  http.get(`${BASE_URL}/drawing/me`, {
    headers: authHeaders(user),
    tags: { api: "myDrawing" },
  });

  http.get(`${BASE_URL}/rankings/podium`, {
    headers: authHeaders(user),
    tags: { api: "podium" },
  });

  http.get(`${BASE_URL}/rankings`, {
    headers: authHeaders(user),
    tags: { api: "rankings" },
  });

  http.get(`${BASE_URL}/rankings/me`, {
    headers: authHeaders(user),
    tags: { api: "myRanking" },
  });
}
