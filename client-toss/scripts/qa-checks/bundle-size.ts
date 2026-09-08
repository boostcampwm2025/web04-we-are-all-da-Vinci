import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { gzipSync } from "node:zlib";
import type { CheckResult } from "./types.js";

const ROOT = resolve(import.meta.dirname, "../..");
const DIST = resolve(ROOT, "dist");
const WEB_DIST = resolve(DIST, "web");

const CODE_BUDGET_BYTES = 800 * 1024;
const TRANSFER_BUDGET_BYTES = 1.5 * 1024 * 1024;

/**
 * WARN 등급을 두지 않는 이유 — qa.ts가 CI에서 warn도 exit 1로 처리한다.
 * 두 임계값을 두면 낮은 쪽 하나와 동작이 같고 리포트만 헷갈린다.
 * 조기 경보는 리포트의 사용률(%)이 대신한다.
 */

const KIB = 1024;
const MIB = 1024 * 1024;

interface FileEntry {
  relPath: string;
  raw: number;
  gzip: number;
  /** 실제 전송량. webp처럼 이미 압축된 파일은 gzip하면 오히려 커지므로 작은 쪽을 쓴다. */
  transfer: number;
}

function walk(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => resolve(entry.parentPath, entry.name));
}

function measure(absPath: string, baseDir: string): FileEntry {
  const buf = readFileSync(absPath);
  // level 9로 고정한다. dist/web 전체가 40ms 안쪽이라 비용이 없고, 값이 결정적이다.
  const gzip = gzipSync(buf, { level: 9 }).length;
  return {
    relPath: relative(baseDir, absPath).split(sep).join("/"),
    raw: buf.length,
    gzip,
    transfer: Math.min(buf.length, gzip),
  };
}

const sum = (entries: FileEntry[], key: "raw" | "gzip" | "transfer") =>
  entries.reduce((acc, entry) => acc + entry[key], 0);

const kib = (bytes: number) => `${(bytes / KIB).toFixed(1)} KiB`;
const mib = (bytes: number) => `${(bytes / MIB).toFixed(2)} MB`;
const pct = (used: number, budget: number) =>
  `${((used / budget) * 100).toFixed(1)}%`;

/** dist 루트의 참고 정보 — RN 셸 번들과 소스맵. 게이트하지 않는다. */
function referenceInfo() {
  if (!existsSync(DIST)) return { rnBundles: null, sourceMaps: null };
  const rootFiles = readdirSync(DIST, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => ({
      name: entry.name,
      size: statSync(resolve(DIST, entry.name)).size,
    }));
  const maps = rootFiles.filter((f) => f.name.endsWith(".map"));
  const bundles = rootFiles.filter((f) => f.name.endsWith(".js"));
  return {
    rnBundles: {
      count: bundles.length,
      bytes: bundles.reduce((a, f) => a + f.size, 0),
    },
    sourceMaps: {
      count: maps.length,
      bytes: maps.reduce((a, f) => a + f.size, 0),
    },
  };
}

export async function run(ciMode = false): Promise<CheckResult> {
  const name = "Bundle Size";

  // dist/web이 없을 때만 빌드한다.
  // 예전에는 ciMode면 무조건 다시 빌드해서 CI에서 pnpm build가 두 번 돌았다
  // (여기 한 번, ci.yml의 Build 스텝에서 또 한 번).
  if (!existsSync(WEB_DIST)) {
    try {
      execSync("pnpm build", { cwd: ROOT, stdio: "pipe", encoding: "utf-8" });
    } catch {
      return {
        name,
        status: "fail",
        details: ["빌드 실패 — 번들 사이즈를 측정할 수 없습니다"],
      };
    }
  }

  if (!existsSync(WEB_DIST)) {
    return {
      name,
      status: "fail",
      details: [
        "dist/web 이 없습니다 — 빌드 산출물이 예상과 다릅니다 (측정하지 못했습니다)",
      ],
    };
  }

  const files = walk(WEB_DIST)
    .map((absPath) => measure(absPath, WEB_DIST))
    .sort((a, b) => b.transfer - a.transfer);

  const code = files.filter(
    (f) => f.relPath.endsWith(".js") || f.relPath.endsWith(".css"),
  );
  const assets = files.filter((f) => !code.includes(f));
  const maps = files.filter((f) => f.relPath.endsWith(".map"));

  const codeBytes = sum(code, "gzip");
  const transferBytes = sum(files, "transfer");

  const details: string[] = [];
  let status: CheckResult["status"] = "pass";

  const codeOver = codeBytes > CODE_BUDGET_BYTES;
  const transferOver = transferBytes > TRANSFER_BUDGET_BYTES;

  details.push(
    `${codeOver ? "[FAIL]" : "[PASS]"} JS+CSS(gzip) ${kib(codeBytes)} / 예산 ${kib(CODE_BUDGET_BYTES)} (${pct(codeBytes, CODE_BUDGET_BYTES)})`,
  );
  details.push(
    `${transferOver ? "[FAIL]" : "[PASS]"} 전송량 합 ${kib(transferBytes)} / 예산 ${kib(TRANSFER_BUDGET_BYTES)} (${pct(transferBytes, TRANSFER_BUDGET_BYTES)})`,
  );
  if (codeOver || transferOver) status = "fail";

  // dist/web에 소스맵이 실리면 소스가 그대로 배포된다. build.sourcemap 회귀 방어.
  if (maps.length > 0) {
    details.push(
      `[FAIL] dist/web에 소스맵 ${maps.length}개 — 배포 산출물에 소스가 포함됩니다`,
    );
    status = "fail";
  }

  const largest = files.slice(0, 3);
  for (const f of largest) {
    details.push(`  ${f.relPath} — ${kib(f.transfer)}`);
  }

  // 참고 정보. 빌드마다 최대 1.8MB 변동하므로 게이트하지 않는다.
  const reference = referenceInfo();
  if (reference.rnBundles) {
    details.push(
      `  (참고) RN 셸 번들 ${reference.rnBundles.count}개 ${mib(reference.rnBundles.bytes)} · 소스맵 ${reference.sourceMaps?.count ?? 0}개 ${mib(reference.sourceMaps?.bytes ?? 0)} — 게이트 대상 아님`,
    );
  }

  return {
    name,
    status,
    details,
    report: {
      ciMode,
      budgets: {
        codeGzip: CODE_BUDGET_BYTES,
        transfer: TRANSFER_BUDGET_BYTES,
      },
      web: {
        codeGzip: codeBytes,
        transfer: transferBytes,
        rawTotal: sum(files, "raw"),
        fileCount: files.length,
        assetCount: assets.length,
        sourceMapCount: maps.length,
        files,
      },
      reference,
    },
  };
}
