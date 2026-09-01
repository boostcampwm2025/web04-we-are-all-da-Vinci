#!/usr/bin/env node
/**
 * 변경된 워크스페이스로부터 "CI에서 실제로 검증해야 할 앱 워크스페이스"를 계산한다.
 *
 * 왜 필요한가
 * -----------
 * 의존 관계는 각 package.json의 `workspace:` 의존으로 이미 정확히 선언돼 있다.
 * 그런데 ci.yml은 그 관계를 사람이 손으로 옮겨 적은 매핑(각 잡의 `if:`)으로 판단해 왔다.
 * 커밋 c1884b92(2026-04-13)에서 toss-shared → similarity 의존이 제거됐지만 매핑은
 * 따라오지 않았고, 그 결과 client-toss 잡이 4개월간 무관한 변경에 헛돌았다.
 *
 * 이 스크립트는 그 매핑을 없앤다. 팬아웃은 pnpm이 워크스페이스 그래프에서 계산하고,
 * 여기서는 입력을 필터 인자로 바꾸고 출력을 잡 이름으로 거르는 일만 한다.
 *
 * pnpm이 그래프의 권위인 이유
 * ---------------------------
 * `pnpm list --filter "...<pkg>"`는 pnpm-workspace.yaml과 각 package.json만 읽는
 * 순수 그래프 조회다. node_modules도 git 히스토리도 필요 없고 전이 폐쇄까지 해준다.
 * (검증: node_modules 없는 매니페스트 전용 트리에서 0.25초에 정확한 결과)
 *
 * 사용법
 * ------
 *   node scripts/affected-workspaces.mjs '["client","packages-shared"]'   # CI: dorny의 changes 출력을 그대로
 *   node scripts/affected-workspaces.mjs packages-shared client            # 로컬: 이름을 나열해도 된다
 *   node scripts/affected-workspaces.mjs --all                             # 전부
 *
 *   인자는 dorny/paths-filter의 `changes` 출력에 담긴 **필터 이름**이다.
 *   `packages-shared` 처럼 `packages-` 로 시작하면 `packages/shared` 로 읽는다
 *   (ci.yml의 필터 블록과 짝을 이루는 규약).
 *
 *   `root`는 특별 취급한다 — 락파일·CI 설정처럼 어느 워크스페이스에도 속하지 않는
 *   파일이라 그래프로 유도할 수 없다. 들어오면 전부 검증한다(`--all`과 동일).
 *
 * 출력: 영향받는 앱 워크스페이스 디렉터리명 JSON 배열 (stdout 한 줄)
 *   예) ["client","server-toss"]
 */

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve, relative, sep } from "node:path";

const ROOT = process.cwd();

/** 루트 package.json의 name. 필터 결과에 섞여 들어오므로 제외해야 한다. */
function rootPackageName() {
  return JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).name;
}

/** pnpm-workspace.yaml이 아니라 pnpm 자신에게 워크스페이스 목록을 묻는다. */
function allWorkspaces() {
  const out = execFileSync("pnpm", ["list", "-r", "--depth", "-1", "--json"], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  return JSON.parse(out).map((w) => ({
    name: w.name,
    dir: relative(ROOT, w.path),
  }));
}

/**
 * 앱 워크스페이스 = ci.yml에 잡이 있는 워크스페이스.
 * `packages/` 아래는 라이브러리라 자체 잡이 없고, 빈 dir은 루트 자신이다.
 */
const isApp = (w) => w.dir !== "" && !w.dir.startsWith(`packages${sep}`);

/** 필터 이름 → 워크스페이스 디렉터리. ci.yml의 필터 블록과 짝을 이루는 규약. */
function filterNameToDir(name) {
  return name.startsWith("packages-")
    ? `packages/${name.slice("packages-".length)}`
    : name;
}

function dirToPackageName(dir) {
  const manifest = resolve(ROOT, dir, "package.json");
  if (!existsSync(manifest)) {
    // fail-closed: 워크스페이스가 아닌 것을 받았다면 매핑이 어긋난 것이다.
    // 조용히 넘어가면 그 워크스페이스의 검증이 통째로 사라진다.
    throw new Error(
      `'${dir}'에 package.json이 없습니다. ci.yml의 필터 이름과 디렉터리가 어긋났을 수 있습니다.`,
    );
  }
  return JSON.parse(readFileSync(manifest, "utf8")).name;
}

/** pnpm에게 "이 패키지들에 의존하는 워크스페이스"를 묻는다(전이 폐쇄 포함). */
function dependentsOf(packageNames) {
  const args = ["list", "--depth", "-1", "--json"];
  for (const n of packageNames) args.push("--filter", `...${n}`);
  const out = execFileSync("pnpm", args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  return JSON.parse(out).map((w) => relative(ROOT, w.path));
}

/**
 * CI는 dorny의 `changes` 출력을 JSON 배열 문자열로 그대로 넘기고,
 * 로컬에서는 이름을 나열하는 편이 읽기 쉽다. 둘 다 받는다.
 */
function parseArgs(argv) {
  const first = argv[0]?.trim();
  if (!first?.startsWith("[")) return argv;
  const parsed = JSON.parse(first);
  if (!Array.isArray(parsed)) throw new Error(`JSON 배열이 아닙니다: ${first}`);
  return parsed.map(String);
}

function main(rawArgv) {
  const argv = parseArgs(rawArgv);

  const apps = allWorkspaces()
    .filter(isApp)
    .map((w) => w.dir);

  // 루트 파일 변경은 그래프로 유도할 수 없다(루트 패키지에 의존하는 워크스페이스가 없다).
  // 락파일 하나로 모든 워크스페이스의 의존성이 바뀔 수 있으므로 전부 검증한다.
  if (argv.includes("--all") || argv.includes("root")) return apps.sort();

  const changed = argv.filter((a) => !a.startsWith("--"));
  if (changed.length === 0) return [];

  const dirs = changed.map(filterNameToDir);
  const names = dirs.map(dirToPackageName);
  const rootName = rootPackageName();

  const affected = dependentsOf(names)
    .filter((dir) => dir !== "") // 루트 워크스페이스 제외
    .filter((dir) => apps.includes(dir));

  // fail-closed: 변경은 있는데 영향받는 앱이 없다는 건 정상 상태가 아니다.
  // pnpm의 --filter는 선택 결과가 0개여도 exit 0으로 성공하므로
  // 여기서 막지 않으면 "아무것도 검증하지 않고 초록불"이 된다 — 고치려던 바로 그 사고다.
  if (affected.length === 0) {
    console.error(
      `::warning::변경(${changed.join(", ")})이 있으나 영향받는 앱을 찾지 못했습니다. ` +
        `안전을 위해 전체를 실행합니다. 루트 패키지=${rootName}`,
    );
    return apps.sort();
  }

  return [...new Set(affected)].sort();
}

try {
  process.stdout.write(JSON.stringify(main(process.argv.slice(2))) + "\n");
} catch (err) {
  // 계산에 실패했으면 잡을 스킵시키지 않는다. changes 잡을 실패시켜 사람이 보게 한다.
  console.error(`::error::영향 워크스페이스 계산 실패: ${err.message}`);
  process.exit(1);
}
