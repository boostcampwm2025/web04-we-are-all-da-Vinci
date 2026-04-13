import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import type { CheckResult } from "./types.js";

const ROOT = resolve(import.meta.dirname, "../..");

const FORBIDDEN_PATTERNS: { pattern: RegExp; description: string }[] = [
  { pattern: /window\.open\s*\(/, description: "window.open() 호출" },
  { pattern: /window\.location\s*[=.]/, description: "window.location 조작" },
  {
    pattern: /document\.location\s*[=.]/,
    description: "document.location 조작",
  },
  { pattern: /href\s*=\s*["']https?:\/\//, description: "외부 HTTP 링크" },
  { pattern: /href\s*=\s*["']market:\/\//, description: "Android 마켓 링크" },
  {
    pattern: /href\s*=\s*["']itms-apps:\/\//,
    description: "iOS App Store 링크",
  },
  { pattern: /href\s*=\s*["']intent:\/\//, description: "Android Intent 링크" },
  {
    pattern: /href\s*=\s*["'](kakaotalk|line|fb):\/\//,
    description: "소셜 딥링크",
  },
];

export async function run(): Promise<CheckResult> {
  const name = "External Links";
  const details: string[] = [];
  let status: CheckResult["status"] = "pass";

  const files = execSync('find src -name "*.ts" -o -name "*.tsx"', {
    cwd: ROOT,
    encoding: "utf-8",
  })
    .trim()
    .split("\n")
    .filter(Boolean);

  for (const relPath of files) {
    const filePath = resolve(ROOT, relPath);
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    for (const { pattern, description } of FORBIDDEN_PATTERNS) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes("// qa-ignore")) continue;
        if (pattern.test(line)) {
          details.push(`[FAIL] ${relPath}:${i + 1} — ${description}`);
          status = "fail";
        }
      }
    }
  }

  if (details.length === 0) {
    details.push("외부 링크 및 앱 설치 유도가 감지되지 않았습니다");
  }

  return { name, status, details };
}
