import { execSync } from "node:child_process";
import { statSync, readdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import type { CheckResult } from "./types.js";

const ROOT = resolve(import.meta.dirname, "../..");
const DIST = resolve(ROOT, "dist");

const MAX_SIZE_MB = 100;
const WARN_SIZE_MB = 50;
const LARGE_CHUNK_MB = 5;

function getDirSize(dir: string): number {
  let total = 0;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      total += getDirSize(fullPath);
    } else {
      total += statSync(fullPath).size;
    }
  }
  return total;
}

function findLargeFiles(
  dir: string,
  threshold: number,
): { path: string; sizeMB: number }[] {
  const results: { path: string; sizeMB: number }[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findLargeFiles(fullPath, threshold));
    } else {
      const size = statSync(fullPath).size;
      if (size > threshold) {
        results.push({
          path: fullPath.replace(DIST + "/", ""),
          sizeMB: Math.round((size / 1024 / 1024) * 100) / 100,
        });
      }
    }
  }
  return results;
}

export async function run(ciMode = false): Promise<CheckResult> {
  const name = "Bundle Size";
  const details: string[] = [];
  let status: CheckResult["status"] = "pass";

  // 빌드가 없으면 실행
  if (!existsSync(DIST) || ciMode) {
    try {
      details.push("빌드 실행 중...");
      execSync("pnpm build", { cwd: ROOT, stdio: "pipe", encoding: "utf-8" });
    } catch {
      return {
        name,
        status: "fail",
        details: ["빌드 실패 — 번들 사이즈 체크를 수행할 수 없습니다"],
      };
    }
  }

  if (!existsSync(DIST)) {
    return {
      name,
      status: "fail",
      details: ["dist/ 디렉토리가 존재하지 않습니다"],
    };
  }

  const totalBytes = getDirSize(DIST);
  const totalMB = Math.round((totalBytes / 1024 / 1024) * 100) / 100;

  if (totalMB > MAX_SIZE_MB) {
    details.push(`[FAIL] 번들 크기: ${totalMB}MB (제한: ${MAX_SIZE_MB}MB)`);
    status = "fail";
  } else if (totalMB > WARN_SIZE_MB) {
    details.push(
      `[WARN] 번들 크기: ${totalMB}MB (경고 기준: ${WARN_SIZE_MB}MB)`,
    );
    status = "warn";
  } else {
    details.push(`[PASS] 번들 크기: ${totalMB}MB`);
  }

  // 큰 파일 리포트
  const largeFiles = findLargeFiles(DIST, LARGE_CHUNK_MB * 1024 * 1024);
  if (largeFiles.length > 0) {
    for (const f of largeFiles) {
      details.push(`  큰 파일: ${f.path} (${f.sizeMB}MB)`);
    }
  }

  return { name, status, details };
}
