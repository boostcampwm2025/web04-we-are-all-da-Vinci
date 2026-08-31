import { Stroke } from "@toss/shared";

/**
 * strokes 문자열을 안전하게 파싱합니다.
 * 과거 TEXT 컬럼(65535 byte) 한도로 인해 잘린 레거시 데이터가 있을 수 있어,
 * 파싱 실패 시 완전하게 닫힌 stroke 객체까지만 최대한 복구합니다.
 */
export function safeParseStrokes(raw: string | null | undefined): Stroke[] {
  if (!raw) return [];

  try {
    return JSON.parse(raw) as Stroke[];
  } catch {
    // strokes 데이터가 잘려서 저장되어 있어요. 일부만 복구
    return recoverTruncatedStrokes(raw);
  }
}

/**
 * 최상위 배열 안의 stroke 객체는 { ... } 안에 중첩 객체가 없으므로,
 * 중괄호 depth가 0으로 돌아오는 지점 = 하나의 stroke 객체가 완전히 닫힌 지점.
 * 문자열 내부의 {, } 는 무시하도록 따옴표 상태도 함께 추적한다.
 */
function recoverTruncatedStrokes(raw: string): Stroke[] {
  let depth = 0;
  let inString = false;
  let escaped = false;
  let lastCompleteEnd = -1;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) {
        lastCompleteEnd = i; // 최상위 stroke 객체 하나가 완전히 닫힌 지점
      }
    }
  }

  if (lastCompleteEnd === -1) {
    // 복구 가능한 stroke가 하나도 없어서 빈 배열을 반환
    return [];
  }

  const truncated = raw.slice(0, lastCompleteEnd + 1) + "]";

  try {
    const recovered = JSON.parse(truncated) as Stroke[];
    return recovered;
  } catch {
    // strokes 복구에 실패해서 빈 배열을 반환
    return [];
  }
}
