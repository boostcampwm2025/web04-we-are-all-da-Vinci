import { execSync } from "node:child_process";
import { resolve } from "node:path";
import type { CheckResult } from "./types.js";

const ROOT = resolve(import.meta.dirname, "../..");

interface SubCheck {
  label: string;
  command: string;
}

const SUB_CHECKS: SubCheck[] = [
  { label: "ESLint", command: "pnpm lint" },
  { label: "TypeScript", command: "npx tsc --noEmit" },
  { label: "Vitest", command: "pnpm test" },
  { label: "Prettier", command: "pnpm format:check" },
];

export async function run(): Promise<CheckResult> {
  const name = "Tooling (Lint/Types/Test/Format)";
  const details: string[] = [];
  let status: CheckResult["status"] = "pass";

  for (const { label, command } of SUB_CHECKS) {
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
