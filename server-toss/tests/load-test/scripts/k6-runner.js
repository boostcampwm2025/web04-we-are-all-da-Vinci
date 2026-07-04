import path from "node:path";
import { Process } from "./exec.js";

export class K6Runner {
  constructor() {}

  async run(options = { vus: 5, durations: "30s", scenario: "baseline" }) {
    const { vus, durations, scenario } = options;
    const code = await Process.run(
      "k6",
      [
        "run",
        this._rename(scenario),
        "--vus",
        vus,
        "--duration",
        durations,
        "--env",
        `VUS=${vus}`,
        "--env",
        `DURATION=${durations}`,
      ],
      process.cwd(),
      [0, 99], // 99 = threshold(SLA) 위반. 부하테스트 자체는 정상 종료된 것이라 파이프라인을 중단시키지 않는다.
    );

    if (code === 99) {
      console.warn("[k6] threshold(SLA) 위반 — 결과 확인 필요");
    }
  }

  _rename(scenario) {
    return path.resolve("tests/load-test/k6", `${scenario}.js`);
  }
}
