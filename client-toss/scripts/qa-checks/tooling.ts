import { execSync } from "node:child_process";
import { resolve } from "node:path";
import type { CheckResult } from "./types.js";

const ROOT = resolve(import.meta.dirname, "../..");

interface SubCheck {
  label: string;
  command: string;
  delegatedInCi?: string;
}

const SUB_CHECKS: SubCheck[] = [
  { label: "ESLint", command: "pnpm lint", delegatedInCi: "ci.yml Lint 스텝" },
  { label: "TypeScript", command: "npx tsc -b --noEmit" },
  {
    label: "Vitest",
    command: "pnpm test",
    delegatedInCi: "ci.yml Test with Coverage 스텝",
  },
  {
    label: "Prettier",
    command: "pnpm format:check",
    delegatedInCi: "ci.yml Format Check 스텝",
  },
];

export async function run(ciMode = false): Promise<CheckResult> {
  const name = "Tooling (Lint/Types/Test/Format)";
  const details: string[] = [];
  let status: CheckResult["status"] = "pass";

  for (const { label, command, delegatedInCi } of SUB_CHECKS) {
    if (ciMode && delegatedInCi) {
      details.push(`[SKIP] ${label} — ${delegatedInCi}에서 실행`);
      continue;
    }
    try {
      execSync(command, { cwd: ROOT, stdio: "pipe", encoding: "utf-8" });
      details.push(`[PASS] ${label}`);
    } catch (err) {
      const error = err as { stderr?: string; stdout?: string };
      const output = (error.stdout || error.stderr || "").trim();
      // 의미 있는 에러 라인 찾기 (pnpm wrapper 출력 건너뛰기)
      const lines = output.split("\n");
      const errorLines = lines.filter(
        (l) =>
          l.includes("error") ||
          l.includes("Error") ||
          l.includes("warn") ||
          l.includes("✖") ||
          l.includes("problems"),
      );
      const summary =
        errorLines.length > 0
          ? errorLines.slice(0, 3).join(" | ")
          : lines.slice(-3).join(" | ");
      details.push(`[FAIL] ${label}: ${summary || "(no output)"}`);
      status = "fail";
    }
  }

  return { name, status, details };
}
