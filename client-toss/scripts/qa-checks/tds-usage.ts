import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import type { CheckResult } from "./types.js";

const ROOT = resolve(import.meta.dirname, "../..");

// 소문자만 매치 — 대문자 <Button> 등은 이미 TDS/React 컴포넌트
const RAW_HTML_RULES: { pattern: RegExp; tdsAlternative: string }[] = [
  { pattern: /<button[\s>]/, tdsAlternative: "@toss/tds-mobile Button" },
  { pattern: /<input[\s>]/, tdsAlternative: "@toss/tds-mobile TextField" },
  { pattern: /<select[\s>]/, tdsAlternative: "@toss/tds-mobile Select" },
  {
    pattern: /<dialog[\s>]/,
    tdsAlternative: "@toss/tds-mobile ConfirmDialog / BottomSheet",
  },
];

// 아이콘 전용 버튼 등 TDS 대체재가 없는 경우 허용
const ALLOWED_BUTTON_PATTERNS = [
  /aria-label=.*색상/, // 색상 팔레트 버튼
  /aria-label=.*취소/, // 아이콘 전용 도구 버튼
  /aria-label=.*초기화/, // 아이콘 전용 도구 버튼
];

function isAllowedButton(line: string): boolean {
  return ALLOWED_BUTTON_PATTERNS.some((p) => p.test(line));
}

export async function run(): Promise<CheckResult> {
  const name = "TDS Usage";
  const details: string[] = [];
  let status: CheckResult["status"] = "pass";

  const findCommand =
    process.platform === "win32"
      ? `powershell -Command "Get-ChildItem -Path src -Recurse -Filter '*.tsx' | ForEach-Object { $_.FullName.Substring($PWD.Path.Length + 1).Replace('\\', '/') }"`
      : 'find src -name "*.tsx"';

  const files = execSync(findCommand, {
    cwd: ROOT,
    encoding: "utf-8",
  })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);

  for (const relPath of files) {
    const filePath = resolve(ROOT, relPath);
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    // TDS import가 있는지 확인 (의도적 사용 여부 판단)
    const hasTdsImport = content.includes("@toss/tds-mobile");

    for (const { pattern, tdsAlternative } of RAW_HTML_RULES) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes("// qa-ignore")) continue;
        // 주석 라인 건너뛰기
        if (
          line.trimStart().startsWith("//") ||
          line.trimStart().startsWith("*")
        )
          continue;

        if (!pattern.test(line)) continue;

        // 아이콘/색상 팔레트 등 TDS 대체재가 없는 커스텀 UI는 허용
        if (pattern.source.includes("button") && isAllowedButton(line)) {
          continue;
        }

        if (hasTdsImport) {
          details.push(
            `[WARN] ${relPath}:${i + 1} — raw <${pattern.source.match(/<(\w+)/)?.[1]}> 사용 (TDS import 있음) → ${tdsAlternative} 검토`,
          );
          if (status === "pass") status = "warn";
        } else {
          details.push(
            `[FAIL] ${relPath}:${i + 1} — raw <${pattern.source.match(/<(\w+)/)?.[1]}> 사용 → ${tdsAlternative} 사용 필요`,
          );
          status = "fail";
        }
      }
    }
  }

  if (details.length === 0) {
    details.push("모든 UI 컴포넌트가 TDS를 사용하고 있습니다");
  }

  return { name, status, details };
}
