/**
 * affected-workspaces.mjs 검증.
 *
 * 핵심 아이디어: **pnpm을 정답지로 쓴다.**
 * 스크립트가 팬아웃을 자체 계산하지 않고 pnpm에 위임하는 것이 설계의 전부이므로,
 * 테스트도 "스크립트 출력 == pnpm에 직접 물은 결과"를 확인한다.
 * 스크립트가 어느 날 자체 로직으로 바뀌어 pnpm과 어긋나면 여기서 잡힌다.
 *
 * 실행: node --test scripts/
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = resolve(ROOT, "scripts/affected-workspaces.mjs");

const APPS = ["client", "client-toss", "server", "server-toss"];

/** 검사 대상 스크립트를 실제로 실행해 결과를 받는다. */
function run(...args) {
  const out = execFileSync("node", [SCRIPT, ...args], {
    cwd: ROOT,
    encoding: "utf8",
  });
  return JSON.parse(out);
}

/** 정답지: pnpm에게 직접 "이 패키지에 의존하는 앱"을 묻는다. */
function pnpmDependentApps(packageName) {
  const out = execFileSync(
    "pnpm",
    ["list", "--depth", "-1", "--json", "--filter", `...${packageName}`],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );
  return JSON.parse(out)
    .map((w) => relative(ROOT, w.path))
    .filter((dir) => APPS.includes(dir))
    .sort();
}

const packageNameOf = (dir) =>
  JSON.parse(readFileSync(resolve(ROOT, dir, "package.json"), "utf8")).name;

describe("변경 워크스페이스로부터 영향 범위 계산", () => {
  describe("공유 패키지의 팬아웃은 pnpm 의존 그래프와 일치한다", () => {
    for (const [filterName, dir] of [
      ["packages-shared", "packages/shared"],
      ["packages-similarity", "packages/similarity"],
      ["packages-toss-shared", "packages/toss-shared"],
    ]) {
      test(`${dir} 변경 시`, () => {
        assert.deepEqual(
          run(filterName),
          pnpmDependentApps(packageNameOf(dir)),
        );
      });
    }
  });

  test("커밋 c1884b92에서 끊긴 의존을 반영한다 — similarity 변경에 client-toss는 포함되지 않는다", () => {
    // ci.yml이 4개월간 틀리게 유지하던 바로 그 관계.
    // toss-shared에서 similarity 의존이 제거됐으므로 client-toss는 무관하다.
    const affected = run("packages-similarity");
    assert.ok(
      !affected.includes("client-toss"),
      `client-toss가 포함되면 안 됩니다. 실제: ${JSON.stringify(affected)}`,
    );
    assert.deepEqual(affected, ["client", "server-toss"]);
  });

  test("앱 워크스페이스 자신이 바뀌면 그 앱만 대상이 된다", () => {
    assert.deepEqual(run("client"), ["client"]);
    assert.deepEqual(run("server-toss"), ["server-toss"]);
  });

  test("여러 워크스페이스가 함께 바뀌면 합집합이 된다", () => {
    assert.deepEqual(run("packages-shared", "packages-toss-shared"), [
      "client",
      "client-toss",
      "server",
      "server-toss",
    ]);
  });

  test("중복 없이 정렬된 배열을 돌려준다", () => {
    const affected = run("packages-shared", "client");
    assert.deepEqual(affected, [...new Set(affected)].sort());
  });

  describe("dorny/paths-filter의 changes 출력을 그대로 받는다", () => {
    test("JSON 배열 문자열을 이름 나열과 동일하게 해석한다", () => {
      assert.deepEqual(
        run('["packages-shared","client"]'),
        run("packages-shared", "client"),
      );
    });

    test("root가 섞여 있으면 나머지와 무관하게 전체를 대상으로 한다", () => {
      // 락파일이 바뀌면 다른 필터가 무엇을 잡았든 전부 검증해야 한다.
      assert.deepEqual(run('["client-toss","root"]'), [...APPS].sort());
    });

    test("빈 배열은 대상 없음이다", () => {
      assert.deepEqual(run("[]"), []);
    });
  });

  describe("검증이 조용히 사라지지 않도록 막는다", () => {
    test("루트 파일이 바뀌면(--all) 모든 앱을 대상으로 한다", () => {
      // 락파일 하나로 전 워크스페이스의 의존성이 바뀔 수 있고,
      // 루트 패키지에 의존하는 워크스페이스가 없어 그래프로는 유도할 수 없다.
      assert.deepEqual(run("--all"), [...APPS].sort());
    });

    test("변경이 없으면 빈 배열을 돌려준다", () => {
      assert.deepEqual(run(), []);
    });

    test("워크스페이스가 아닌 이름을 받으면 조용히 통과하지 않고 실패한다", () => {
      // pnpm의 --filter는 선택 결과가 0개여도 exit 0으로 성공한다.
      // 그 성질을 그대로 두면 "아무것도 검증하지 않고 초록불"이 된다.
      assert.throws(
        () => run("packages-nonexistent"),
        /status 1|Command failed/,
      );
    });
  });
});
