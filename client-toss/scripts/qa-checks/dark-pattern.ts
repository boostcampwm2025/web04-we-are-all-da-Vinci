import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import type { CheckResult } from "./types.js";

const ROOT = resolve(import.meta.dirname, "../..");

// 앱 플로우: Home(/) → Memorize(/memorize) → Drawing(/drawing) → Submitted(/submitted)
// 핵심 플로우: memorize (기억 단계), drawing (드로잉 단계)

export async function run(): Promise<CheckResult> {
  const name = "Dark Pattern";
  const details: string[] = [];
  let status: CheckResult["status"] = "pass";

  const files = execSync('find src -name "*.tsx"', {
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

    const isHomeView = relPath.includes("home/") || relPath.includes("Home");
    const isCoreFlow =
      relPath.includes("drawing/") ||
      relPath.includes("Drawing") ||
      relPath.includes("memorize/") ||
      relPath.includes("Memorize");

    // 1. 진입 시 바텀시트/모달 자동 오픈 감지 (홈 화면)
    if (isHomeView) {
      if (
        /useState\(\s*true\s*\)/.test(content) &&
        /BottomSheet|Modal|Dialog/.test(content)
      ) {
        details.push(
          `[FAIL] ${relPath} — 홈 진입 시 바텀시트/모달이 기본 열림 상태`,
        );
        status = "fail";
      }
      if (/useEffect\s*\(\s*\(\)\s*=>/.test(content)) {
        const useEffectBlocks = content.match(
          /useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*\}/gs,
        );
        if (useEffectBlocks) {
          for (const block of useEffectBlocks) {
            if (
              /setShow|setOpen|setVisible|setModal|openModal|openSheet/.test(
                block,
              )
            ) {
              details.push(
                `[FAIL] ${relPath} — useEffect에서 모달/바텀시트 자동 오픈`,
              );
              status = "fail";
            }
          }
        }
      }
    }

    // 2. 뒤로가기 차단 감지 (모든 화면)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes("// qa-ignore")) continue;

      if (/addEventListener\s*\(\s*["']popstate["']/.test(line)) {
        details.push(
          `[WARN] ${relPath}:${i + 1} — popstate 이벤트 리스너 (뒤로가기 차단 여부 확인 필요)`,
        );
        if (status === "pass") status = "warn";
      }
      if (/beforeunload/.test(line)) {
        details.push(
          `[WARN] ${relPath}:${i + 1} — beforeunload 이벤트 (뒤로가기 차단 여부 확인 필요)`,
        );
        if (status === "pass") status = "warn";
      }
      if (/useBlocker/.test(line)) {
        details.push(
          `[WARN] ${relPath}:${i + 1} — useBlocker 사용 (나가기 옵션 반드시 제공 필요)`,
        );
        if (status === "pass") status = "warn";
      }
    }

    // 3. 핵심 플로우(memorize, drawing)에서 전면/보상 광고 노출
    if (isCoreFlow) {
      // 전면/보상형 광고는 핵심 플로우에서 금지
      if (/RewardAd|InterstitialAd|전면.*광고/.test(content)) {
        details.push(
          `[FAIL] ${relPath} — 핵심 플로우에서 전면/보상형 광고 노출 (금지)`,
        );
        status = "fail";
      }
      // drawing 화면에는 배너 광고도 부적절
      if (
        (relPath.includes("drawing/") || relPath.includes("Drawing")) &&
        /BannerAd/.test(content)
      ) {
        details.push(
          `[FAIL] ${relPath} — 드로잉 화면에서 배너 광고 노출 (핵심 인터랙션 방해)`,
        );
        status = "fail";
      }
    }

    // 4. Dialog/BottomSheet에 닫기 옵션 없는 경우
    if (/ConfirmDialog[\s>]/.test(content)) {
      // ConfirmDialog는 cancelButton 또는 onClose가 있어야 함
      if (!/cancelButton|CancelButton|onClose/.test(content)) {
        details.push(
          `[FAIL] ${relPath} — ConfirmDialog에 닫기/취소 버튼이 없습니다`,
        );
        status = "fail";
      }
    }
    if (/BottomSheet[\s>]/.test(content)) {
      if (!/onClose|onDismiss/.test(content)) {
        details.push(
          `[FAIL] ${relPath} — BottomSheet에 닫기 핸들러가 없습니다`,
        );
        status = "fail";
      }
    }

    // 5. CTA 버튼 텍스트 모호성 검사
    // TDS Button 내부 텍스트가 맥락 없이 "확인", "네", "OK"만 있는 경우
    const ctaMatches = content.matchAll(
      /<(?:Button|CTAButton)[^>]*>\s*(확인|네|OK|Yes)\s*<\//g,
    );
    for (const match of ctaMatches) {
      const lineIdx = content.slice(0, match.index).split("\n").length;
      details.push(
        `[WARN] ${relPath}:${lineIdx} — CTA 텍스트 "${match[1]}"이 모호합니다 (구체적인 행동을 명시 권장)`,
      );
      if (status === "pass") status = "warn";
    }
  }

  if (details.length === 0) {
    details.push("다크패턴이 감지되지 않았습니다");
  }

  return { name, status, details };
}
