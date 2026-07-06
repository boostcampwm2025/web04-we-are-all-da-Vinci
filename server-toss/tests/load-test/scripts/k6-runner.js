import path from "node:path";
import fs from "node:fs";
import { Process } from "./exec.js";

export class K6Runner {
  constructor() {}

  async warmup(options = { vus: 5, durations: "30s", scenario: "baseline" }) {
    const { vus, durations, scenario } = options;
    const result = await Process.run(
      {
        command: "k6",
        args: [
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
          "--no-summary",
        ],
        cwd: process.cwd(),
        allowedExitCodes: [0, 99],
      }, // 99 = threshold(SLA) 위반. 부하테스트 자체는 정상 종료된 것이라 파이프라인을 중단시키지 않는다.
    );

    if (result.exitCode === 99) {
      console.warn("[k6] threshold(SLA) 위반 — 결과 확인 필요");
    }
  }

  /**
   *
   * @param {{config: {vus: number, durations: string, scenario: string}, outputDir: string}} param0
   */
  async run({
    config = { vus: 5, durations: "30s", scenario: "baseline" },
    outputDir,
  }) {
    const stdout = path.join(outputDir, "stdout.log");
    const stderr = path.join(outputDir, "stderr.log");

    const { vus, durations, scenario } = config;
    const result = await Process.run({
      command: "k6",
      args: [
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
        "--env",
        `RESULT_DIR=${outputDir}`,
        "--env",
        "K6_WEB_DASHBOARD=true",
        "--env",
        `K6_WEB_DASHBOARD_EXPORT=${path.join(outputDir, "html-report.html")}`,
      ],
      cwd: process.cwd(),
      allowedExitCodes: [0, 99],
      stdoutFile: stdout,
      stderrFile: stderr,
    });

    if (result.exitCode === 99) {
      console.warn("[k6] threshold(SLA) 위반 — 결과 확인 필요");
    }
  }

  _rename(scenario) {
    return path.resolve("tests/load-test/k6", `${scenario}.js`);
  }
}
