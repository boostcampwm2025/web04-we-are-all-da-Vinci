import { getDeviceId } from "@apps-in-toss/web-framework";

// 토스 SDK getDeviceId의 string/object 반환과 throw 가능성을 흡수해 항상 string을 반환한다.
// 비-토스 환경(브라우저 dev, 미지원 버전)에서는 "local"로 폴백.
const resolveAnonymousHash = async (): Promise<string> => {
  try {
    const result = (await getDeviceId()) as unknown as
      | { deviceId?: string }
      | string;
    return typeof result === "string" ? result : (result?.deviceId ?? "local");
  } catch {
    return "local";
  }
};

// 기기 ID는 세션 안에서 바뀌지 않는다 — 브리지 왕복을 1회로 줄인다(도전 시작 경로에서 직렬로 붙던 왕복 제거).
// "local" 폴백은 일시 오류일 수 있으므로 캐시하지 않고 다음 호출에서 다시 시도한다.
let anonymousHashPromise: Promise<string> | null = null;

export const getAnonymousHash = (): Promise<string> => {
  if (anonymousHashPromise) return anonymousHashPromise;
  const pending = resolveAnonymousHash().then((hash) => {
    if (hash === "local") anonymousHashPromise = null;
    return hash;
  });
  anonymousHashPromise = pending;
  return pending;
};

/** 테스트 전용 — 세션 캐시를 비워 getDeviceId 모킹을 테스트마다 바꿀 수 있게 한다. */
export const resetAnonymousHashCache = () => {
  anonymousHashPromise = null;
};
