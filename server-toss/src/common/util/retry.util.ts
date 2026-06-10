// 외부 API 호출용 범용 재시도 유틸.
//
// 설계 원칙: 재시도의 "메커니즘"(루프·대기·중단)만 이 유틸이 갖고, "정책"(무엇을 재시도할지,
// 얼마나 기다릴지)은 전부 호출자가 주입한다(isRetryable, backoffMs).
//
// 왜 정책을 호출자에게 위임하나:
// 호출 대상이 멱등하지 않으면(예: 토스 메신저 API는 Idempotency-Key 미지원) 무분별한 재시도가
// 중복 부수효과(중복 발송)를 일으킨다. 따라서 "재시도해도 안전한 에러"의 범위를 호출자가
// 도메인에 맞게 좁게(예: 네트워크/타임아웃/5xx만) 통제할 수 있어야 한다. 유틸이 정책을
// 고정해버리면 이 안전 통제권을 뺏기므로, isRetryable을 주입 지점으로 둔다.

// 시도마다 대기시간을 곱하는 배수(2 = 지수 2배: base, base*2, base*4 ...).
const BACKOFF_GROWTH_FACTOR = 2;
// 대기시간에 적용하는 무작위 흔들림 비율의 기본값(±25%).
const DEFAULT_JITTER_RATIO = 0.25;

export type WithRetryOptions = {
  maxAttempts: number;
  isRetryable: (err: unknown) => boolean;
  backoffMs: (attempt: number) => number; // attempt: 0..maxAttempts-1
  onRetry?: (err: unknown, attempt: number) => void;
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: WithRetryOptions,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isLast = attempt === options.maxAttempts - 1;
      // 즉시 중단(throw)하는 두 경우:
      //  - 마지막 시도: 다음 시도가 없으니 backoff 대기는 낭비 → 바로 throw.
      //  - 재시도 불가 에러(예: 4xx): 다시 보내도 결과가 같으니 첫 실패에서 포기.
      if (isLast || !options.isRetryable(err)) {
        throw err;
      }
      options.onRetry?.(err, attempt);
      await sleep(options.backoffMs(attempt));
    }
  }
  throw lastErr; // 이론상 도달 불가(마지막 시도에서 throw). 타입 안전용 fallback.
}

// 지수 백오프 + 지터 전략 생성기.
//
// - 지수 증가(base → base*2 → base*4 ...): 일시적 장애(서버 과부하 등)에 재시도 간격을 점점
//   늘려 대상 서버에 회복 여유를 준다. 짧은 간격으로 몰아치면 장애를 악화시키기 때문이다.
// - 지터(±jitterRatio): 동시에 실패한 여러 호출이 똑같은 간격으로 재시도하면 부하가 같은
//   시점에 다시 몰린다(thundering herd). 각 대기시간을 무작위로 흩뿌려 재시도 시점을 분산한다.
export const exponentialBackoff = (
  baseMs: number,
  jitterRatio = DEFAULT_JITTER_RATIO,
): ((attempt: number) => number) => {
  return (attempt: number) => {
    const exact = baseMs * BACKOFF_GROWTH_FACTOR ** attempt;
    // Math.random()(0~1)을 (−1~1)로 변환한 뒤 jitterRatio를 곱해 ±jitterRatio 흔들림을 만든다.
    const jitter = (Math.random() - 0.5) * 2 * jitterRatio;
    return Math.max(0, Math.round(exact * (1 + jitter)));
  };
};
