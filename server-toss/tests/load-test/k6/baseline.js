import http from "k6/http";
import { check, group, sleep } from "k6";
import { SharedArray } from "k6/data";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.1.0/index.js";
import { generateHtmlReport } from "./report-template.js";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const TEST_AD_GROUP_ID = __ENV.TEST_AD_GROUP_ID || "TEST_AD_GROUP";

const optionsConfig = JSON.parse(open("./options.json"));
const STAGES = optionsConfig.scenarios.baseline.stages;
const MAX_VUS = Math.max(...STAGES.map((stage) => stage.target));

export const options = optionsConfig;

const users = new SharedArray("users", function () {
  return JSON.parse(open("../fixtures/tokens.json"));
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

  // --- 홈 화면 진입 ---
  group("home", () => {
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
  });

  sleep(randomBetween(1, 3));

  // --- 게임 시작 + 드로잉 ---
  group("draw", () => {
    const startRes = http.post(`${BASE_URL}/plays/start`, "", {
      headers: authHeaders(user),
      tags: { api: "start" },
    });

    const startOk = check(startRes, {
      "start success": (r) => r.status === 200 || r.status === 201,
    });

    if (!startOk) {
      return;
    }

    const promptJson = startRes.json();
    const strokes = promptJson.strokes;

    if (!strokes) {
      return;
    }

    const strokesPayload = JSON.stringify({ strokes });

    for (let i = 0; i < 20; ++i) {
      sendStroke({
        user,
        strokesPayload,
      });

      sleep(randomBetween(0.5, 3.0));
    }

    const submitRes = http.post(`${BASE_URL}/drawing`, strokesPayload, {
      headers: authHeaders(user),
      tags: { api: "submit" },
    });

    check(submitRes, {
      "submit success": (r) => r.status === 201 || r.status === 200,
    });
  });

  sleep(randomBetween(1, 2));

  // --- 결과 확인 ---
  group("results", () => {
    const responses = http.batch([
      [
        "GET",
        `${BASE_URL}/drawing/me`,
        null,
        { headers: authHeaders(user), tags: { api: "myDrawings" } },
      ],
      [
        "GET",
        `${BASE_URL}/rankings/podium`,
        null,
        { headers: authHeaders(user), tags: { api: "podium" } },
      ],
      [
        "GET",
        `${BASE_URL}/rankings`,
        null,
        { headers: authHeaders(user), tags: { api: "rankings" } },
      ],
      [
        "GET",
        `${BASE_URL}/rankings/me`,
        null,
        { headers: authHeaders(user), tags: { api: "myRanking" } },
      ],
    ]);

    check(responses[0], { "my drawing success": (r) => r.status === 200 });
    check(responses[1], { "podium success": (r) => r.status === 200 });
    check(responses[2], { "rankings success": (r) => r.status === 200 });
    check(responses[3], { "my ranking success": (r) => r.status === 200 });
  });

  sleep(randomBetween(1, 2));

  // --- 광고 보고 기회 충전 ---
  group("charge", () => {
    const chargeChancesByAdPayload = JSON.stringify({
      source: "ad",
      sdkPayload: {
        adGroupId: TEST_AD_GROUP_ID,
        unitType: "point",
        unitAmount: 1,
      },
    });
    const chargeRes = http.post(
      `${BASE_URL}/chances/charge`,
      chargeChancesByAdPayload,
      {
        headers: authHeaders(user),
        tags: { api: "chargeChancesByAd" },
      },
    );

    check(chargeRes, {
      "charge success": (r) => r.status === 201 || r.status === 200,
    });
  });

  sleep(randomBetween(2, 10));
}

export function handleSummary(data) {
  const resultDir = __ENV.RESULT_DIR;
  const outputs = {
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };

  if (resultDir) {
    outputs[`${resultDir}/summary.json`] = JSON.stringify(data, null, 2);
    outputs[`${resultDir}/report.html`] = generateHtmlReport(data, {
      maxVUs: MAX_VUS,
      stages: STAGES,
      thresholds: optionsConfig.thresholds,
    });
  }

  return outputs;
}
