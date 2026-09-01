import { run as runTooling } from "./qa-checks/tooling.js";
import { run as runGraniteConfig } from "./qa-checks/granite-config.js";
import { run as runTdsUsage } from "./qa-checks/tds-usage.js";
import { run as runUxWriting } from "./qa-checks/ux-writing.js";
import { run as runDarkPattern } from "./qa-checks/dark-pattern.js";
import { run as runAdIntegration } from "./qa-checks/ad-integration.js";
import { run as runExternalLinks } from "./qa-checks/external-links.js";
import { run as runBundleSize } from "./qa-checks/bundle-size.js";
import type { CheckResult, QaReport } from "./qa-checks/types.js";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ciMode = process.argv.includes("--ci");

const reportPath = process.argv
  .find((arg) => arg.startsWith("--report-json="))
  ?.slice("--report-json=".length);

const STATUS_ICON: Record<CheckResult["status"], string> = {
  pass: "PASS",
  fail: "FAIL",
  warn: "WARN",
};

const STATUS_COLOR: Record<CheckResult["status"], string> = {
  pass: "\x1b[32m", // green
  fail: "\x1b[31m", // red
  warn: "\x1b[33m", // yellow
};
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

function printResult(result: CheckResult) {
  const color = STATUS_COLOR[result.status];
  console.log(
    ` ${color}[${STATUS_ICON[result.status]}]${RESET} ${result.name}`,
  );
  for (const detail of result.details) {
    console.log(`       ${detail}`);
  }
}

async function main() {
  console.log("");
  console.log(`${BOLD}══════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}  Apps-in-Toss QA Report${RESET}`);
  console.log(`${BOLD}══════════════════════════════════════════${RESET}`);
  console.log("");

  const checks: { name: string; run: () => Promise<CheckResult> }[] = [
    { name: "Tooling (Lint/Types/Test/Format)", run: () => runTooling(ciMode) },
    { name: "Granite Config", run: runGraniteConfig },
    { name: "TDS Usage", run: runTdsUsage },
    { name: "UX Writing", run: runUxWriting },
    { name: "Dark Pattern", run: runDarkPattern },
    { name: "Ad Integration", run: runAdIntegration },
    { name: "External Links", run: runExternalLinks },
    { name: "Bundle Size", run: () => runBundleSize(ciMode) },
  ];

  const results: CheckResult[] = [];

  for (const { name, run } of checks) {
    let result: CheckResult;
    try {
      result = await run();
    } catch (error) {
      result = {
        name,
        status: "fail",
        details: [
          `[FAIL] ${error instanceof Error ? error.message : String(error)}`,
        ],
      };
    }
    results.push(result);
    printResult(result);
    console.log("");
  }

  // Summary
  const pass = results.filter((r) => r.status === "pass").length;
  const warn = results.filter((r) => r.status === "warn").length;
  const fail = results.filter((r) => r.status === "fail").length;

  console.log(`${BOLD}══════════════════════════════════════════${RESET}`);
  console.log(
    ` Result: ${STATUS_COLOR.pass}${pass} PASS${RESET}, ${STATUS_COLOR.warn}${warn} WARN${RESET}, ${STATUS_COLOR.fail}${fail} FAIL${RESET}`,
  );
  console.log(`${BOLD}══════════════════════════════════════════${RESET}`);
  console.log("");

  // exit 전에 기록한다. 실패한 실행일수록 리포트가 필요하다.
  if (reportPath) {
    const report: QaReport = {
      ciMode,
      summary: { pass, warn, fail },
      results,
    };
    writeFileSync(resolve(process.cwd(), reportPath), JSON.stringify(report));
  }

  // CI에서는 WARN도 실패로 취급한다(앱인토스 심사 기준을 느슨하게 통과시키지 않기 위해).
  if (fail > 0 || (ciMode && warn > 0)) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("QA 스크립트 실행 중 오류:", err);
  process.exit(1);
});
