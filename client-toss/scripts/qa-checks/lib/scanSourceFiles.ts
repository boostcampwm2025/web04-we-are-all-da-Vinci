import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const SRC_DIR = resolve(ROOT, "src");

export interface SourceFile {
  relPath: string;
  content: string;
  lines: string[];
}

export class ScanEmptyError extends Error {
  constructor(readonly extensions: readonly string[]) {
    super(
      `검사 대상을 찾지 못했어요 (src/**/*{${extensions.join(",")}}) — 검사가 돌지 않았습니다`,
    );
    this.name = "ScanEmptyError";
  }
}

/** 확장자별 스캔 결과 캐시. 5개 검사가 같은 파일을 각자 읽던 것을 한 번으로 줄인다. */
const cache = new Map<string, SourceFile[]>();

/**
 * `src/` 아래에서 주어진 확장자의 파일을 모두 읽어 돌려준다.
 *
 * 셸(`find`/PowerShell) 대신 Node API를 쓴다 — OS 분기가 사라지고,
 * 셸이 실패해 0건이 반환되는 경로도 없어진다.
 *
 * @throws {ScanEmptyError} 대상 파일이 하나도 없을 때
 */
export function scanSourceFiles(
  extensions: readonly string[],
): readonly SourceFile[] {
  const key = [...extensions].sort().join("|");
  const cached = cache.get(key);
  if (cached) return cached;

  const entries = readdirSync(SRC_DIR, {
    recursive: true,
    withFileTypes: true,
  });

  const files = entries
    .filter(
      (entry) =>
        entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext)),
    )
    .map((entry) => {
      const absPath = resolve(entry.parentPath, entry.name);
      return {
        relPath: relative(ROOT, absPath).split(sep).join("/"),
        absPath,
      };
    })
    // 리포트 순서를 빌드 환경과 무관하게 고정한다.
    .sort((a, b) => a.relPath.localeCompare(b.relPath));

  if (files.length === 0) {
    throw new ScanEmptyError(extensions);
  }

  const result = files.map(({ relPath, absPath }) => {
    const content = readFileSync(absPath, "utf-8");
    return { relPath, content, lines: content.split("\n") };
  });

  cache.set(key, result);
  return result;
}
