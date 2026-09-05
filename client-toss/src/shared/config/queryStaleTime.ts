/**
 * 서버 상태 캐시(TanStack Query)의 하루 **안** 신선도.
 * 하루 **경계**는 queryKey의 KST 날짜(getKstDate)가 다스린다 — staleTime으로 흉내내지 않는다.
 */
export const QUERY_STALE_TIME = {
  /** 불변이거나 날짜 키를 가진 리소스 — 하루 안에서는 재요청하지 않는다. */
  IMMUTABLE: Infinity,
  /** 남이 제출하면 바뀌는 값(내 순위)·사용자가 즉시 확인하는 값(포인트). */
  VOLATILE: 30 * 1000,
  /** 액션마다 진행도가 바뀌는 미션. */
  MISSIONS: 60 * 1000,
  /** 배치 스냅샷(TOP100·시상대). */
  SNAPSHOT: 5 * 60 * 1000,
} as const;

/** strokes가 든 큰 응답(영속 제외)은 탭을 떠난 뒤 메모리를 오래 잡지 않게 짧게 GC한다. */
export const LARGE_RESPONSE_GC_TIME = 5 * 60 * 1000;
