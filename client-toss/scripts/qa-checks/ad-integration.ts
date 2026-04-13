import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import type { CheckResult } from "./types.js";

const ROOT = resolve(import.meta.dirname, "../..");

const THIRD_PARTY_AD_SDKS = [
  "google-mobile-ads",
  "react-native-google-mobile-ads",
  "@react-native-admob",
  "react-native-admob",
  "facebook-audience-network",
  "react-native-fbads",
  "unity-ads",
  "applovin",
  "ironsource",
];

export async function run(): Promise<CheckResult> {
  const name = "Ad Integration";
  const details: string[] = [];
  let status: CheckResult["status"] = "pass";

  // 1. package.json에 외부 광고 SDK 없는지 확인
  const pkgPath = resolve(ROOT, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

  for (const sdk of THIRD_PARTY_AD_SDKS) {
    if (allDeps[sdk]) {
      details.push(`[FAIL] 외부 광고 SDK 감지: ${sdk} (앱인토스 광고만 허용)`);
      status = "fail";
    }
  }

  // 2. 소스에서 제3자 광고 SDK import 스캔
  const files = execSync('find src -name "*.ts" -o -name "*.tsx"', {
    cwd: ROOT,
    encoding: "utf-8",
  })
    .trim()
    .split("\n")
    .filter(Boolean);

  for (const relPath of files) {
    const content = readFileSync(resolve(ROOT, relPath), "utf-8");
    for (const sdk of THIRD_PARTY_AD_SDKS) {
      if (
        content.includes(`from '${sdk}'`) ||
        content.includes(`from "${sdk}"`)
      ) {
        details.push(`[FAIL] ${relPath} — 외부 광고 SDK import: ${sdk}`);
        status = "fail";
      }
    }
  }

  // 3. TossAds 초기화가 App.tsx에 있는지 확인
  const appPath = resolve(ROOT, "src/App.tsx");
  try {
    const appContent = readFileSync(appPath, "utf-8");
    if (!appContent.includes("initTossAdsOnce")) {
      details.push(
        "[WARN] App.tsx에서 initTossAdsOnce() 호출이 감지되지 않았습니다",
      );
      if (status === "pass") status = "warn";
    }
  } catch {
    details.push("[WARN] src/App.tsx 파일을 읽을 수 없습니다");
    if (status === "pass") status = "warn";
  }

  if (details.length === 0) {
    details.push(
      "앱인토스 광고 SDK만 사용 중이며, 초기화가 정상 설정되어 있습니다",
    );
  }

  return { name, status, details };
}
