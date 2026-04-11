import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import type { CheckResult } from "./types.js";

const ROOT = resolve(import.meta.dirname, "../..");

// 격식체 (합니다/습니다) — 해요체로 변경 필요
const FORMAL_ENDINGS =
  /[가-힣]+(합니다|습니다|하십시오|십시오|하시기 바랍니다)[.!?"')\s]*$/;
// 반말 (해/돼/야 등) — 해요체로 변경 필요
const INFORMAL_ENDINGS = /[가-힣]+(해|돼|야|거야|인데|거든|잖아)[.!?"')\s]*$/;
// 부정적 표현 — 긍정 표현 권장
const NEGATIVE_PATTERNS = [
  /할 수 없/,
  /불가능/,
  /사용할 수 없/,
  /이용할 수 없/,
];
// 수동태 — 능동태 권장
const PASSIVE_PATTERNS = [/됩니다/, /되었습니다/, /되셨습니다/];

// JSX 텍스트와 문자열 리터럴에서 한국어 추출
function extractKoreanTexts(content: string): { text: string; line: number }[] {
  const results: { text: string; line: number }[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("// qa-ignore")) continue;

    // JSX 텍스트 내 한국어 (태그 사이 텍스트)
    const jsxTexts = line.match(/>[^<]*[가-힣]+[^<]*/g);
    if (jsxTexts) {
      for (const match of jsxTexts) {
        results.push({ text: match.replace(/^>/, "").trim(), line: i + 1 });
      }
    }

    // 문자열 리터럴 내 한국어
    const stringLiterals = line.match(/["'`][^"'`]*[가-힣]+[^"'`]*["'`]/g);
    if (stringLiterals) {
      for (const match of stringLiterals) {
        results.push({ text: match.slice(1, -1).trim(), line: i + 1 });
      }
    }
  }

  return results;
}

export async function run(): Promise<CheckResult> {
  const name = "UX Writing";
  const details: string[] = [];
  let status: CheckResult["status"] = "pass";

  const files = execSync('find src -name "*.tsx" -o -name "*.ts"', {
    cwd: ROOT,
    encoding: "utf-8",
  })
    .trim()
    .split("\n")
    .filter(Boolean);

  for (const relPath of files) {
    const filePath = resolve(ROOT, relPath);
    const content = readFileSync(filePath, "utf-8");

    // 1. 해요체 검증
    const koreanTexts = extractKoreanTexts(content);
    for (const { text, line } of koreanTexts) {
      if (text.length < 3) continue; // 너무 짧은 텍스트 건너뛰기

      if (FORMAL_ENDINGS.test(text)) {
        details.push(
          `[FAIL] ${relPath}:${line} — 격식체 사용 (해요체로 변경 필요): "${text}"`,
        );
        status = "fail";
      }
      if (INFORMAL_ENDINGS.test(text)) {
        // 반말은 경고 수준
        details.push(
          `[WARN] ${relPath}:${line} — 반말 사용 (해요체 권장): "${text}"`,
        );
        if (status === "pass") status = "warn";
      }
    }

    // 2. 다이얼로그 취소 버튼 텍스트 검증
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/CancelButton/.test(line) && /취소/.test(line)) {
        details.push(
          `[FAIL] ${relPath}:${i + 1} — 다이얼로그 취소 버튼에 "취소" 사용 (토스 가이드: "닫기" 사용)`,
        );
        status = "fail";
      }
    }

    // 3. 부정적 표현 감지
    for (const pattern of NEGATIVE_PATTERNS) {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("// qa-ignore")) continue;
        if (pattern.test(lines[i])) {
          const match = lines[i].match(pattern)?.[0];
          details.push(
            `[WARN] ${relPath}:${i + 1} — 부정적 표현 "${match}" (긍정 표현 권장)`,
          );
          if (status === "pass") status = "warn";
        }
      }
    }

    // 4. 수동태 감지
    for (const pattern of PASSIVE_PATTERNS) {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("// qa-ignore")) continue;
        if (pattern.test(lines[i])) {
          const match = lines[i].match(pattern)?.[0];
          details.push(
            `[WARN] ${relPath}:${i + 1} — 수동태 "${match}" (능동태 권장)`,
          );
          if (status === "pass") status = "warn";
        }
      }
    }
  }

  if (details.length === 0) {
    details.push("UX 라이팅 가이드를 준수하고 있습니다");
  }

  return { name, status, details };
}
