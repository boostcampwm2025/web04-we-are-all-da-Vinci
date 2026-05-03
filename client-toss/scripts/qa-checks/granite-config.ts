import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { CheckResult } from "./types.js";

const ROOT = resolve(import.meta.dirname, "../..");

export async function run(): Promise<CheckResult> {
  const name = "Granite Config";
  const details: string[] = [];
  let status: CheckResult["status"] = "pass";

  const configPath = resolve(ROOT, "granite.config.ts");
  let content: string;
  try {
    content = readFileSync(configPath, "utf-8");
  } catch {
    return {
      name,
      status: "fail",
      details: ["granite.config.ts 파일을 찾을 수 없습니다"],
    };
  }

  // appName 존재 확인
  if (!/appName:\s*["'][\w-]+["']/.test(content)) {
    details.push("[FAIL] appName이 없거나 비어있습니다");
    status = "fail";
  }

  // brand.displayName 존재 확인
  if (!/displayName:\s*["'].+["']/.test(content)) {
    details.push("[FAIL] brand.displayName이 없습니다");
    status = "fail";
  }

  // primaryColor가 유효한 hex인지
  const colorMatch = content.match(/primaryColor:\s*["'](#[0-9a-fA-F]{6})["']/);
  if (!colorMatch) {
    details.push("[FAIL] brand.primaryColor가 유효한 hex 색상이 아닙니다");
    status = "fail";
  }

  // icon URL이 static.toss.im 도메인인지
  const iconMatch = content.match(/icon:\s*["'](https?:\/\/[^"']+)["']/);
  if (!iconMatch) {
    details.push("[FAIL] brand.icon URL이 없습니다");
    status = "fail";
  } else if (!iconMatch[1].includes("static.toss.im")) {
    details.push(
      `[WARN] brand.icon이 static.toss.im 도메인이 아닙니다: ${iconMatch[1]}`,
    );
    if (status === "pass") status = "warn";
  }

  // webViewProps.type이 "partner"(비게임)인지
  const typeMatch = content.match(/type:\s*["'](partner|game)["']/);
  if (!typeMatch) {
    details.push("[FAIL] webViewProps.type이 설정되지 않았습니다");
    status = "fail";
  } else if (typeMatch[1] !== "partner") {
    details.push(
      `[WARN] webViewProps.type이 "${typeMatch[1]}"입니다 (비게임은 "partner" 권장)`,
    );
    if (status === "pass") status = "warn";
  }

  // permissions 배열 존재
  if (!/permissions:\s*\[/.test(content)) {
    details.push("[FAIL] permissions 배열이 없습니다");
    status = "fail";
  }

  // commands 존재
  if (!/dev:\s*["']/.test(content) || !/build:\s*["']/.test(content)) {
    details.push("[FAIL] web.commands.dev 또는 build가 없습니다");
    status = "fail";
  }

  if (details.length === 0) {
    details.push("모든 필수 설정이 올바르게 구성되어 있습니다");
  }

  return { name, status, details };
}
