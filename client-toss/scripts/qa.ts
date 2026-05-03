import { run as runTooling } from "./qa-checks/tooling.js";
import { run as runGraniteConfig } from "./qa-checks/granite-config.js";
import { run as runTdsUsage } from "./qa-checks/tds-usage.js";
import { run as runUxWriting } from "./qa-checks/ux-writing.js";
import { run as runDarkPattern } from "./qa-checks/dark-pattern.js";
import { run as runAdIntegration } from "./qa-checks/ad-integration.js";
import { run as runExternalLinks } from "./qa-checks/external-links.js";
import { run as runBundleSize } from "./qa-checks/bundle-size.js";
import type { CheckResult } from "./qa-checks/types.js";

const ciMode = process.argv.includes("--ci");

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

  const checks = [
    runTooling,
    runGraniteConfig,
    runTdsUsage,
    runUxWriting,
    runDarkPattern,
    runAdIntegration,
    runExternalLinks,
    () => runBundleSize(ciMode),
  ];

  const results: CheckResult[] = [];

  for (const check of checks) {
    const result = await check();
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

  if (ciMode && (fail > 0 || warn > 0)) {
    process.exit(1);
  } else if (fail > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("QA 스크립트 실행 중 오류:", err);
  process.exit(1);
});
