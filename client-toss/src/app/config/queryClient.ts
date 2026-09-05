import { RequestError, onSessionCleared } from "@/shared/api";
import { QueryClient } from "@tanstack/react-query";
import {
  PERSIST_MAX_AGE,
  createLocalStoragePersister,
  setupQueryPersistence,
} from "./queryPersistence";

/**
 * RequestError(HTTP 4xx/5xx)는 request() 안에서 401 재발급·Sentry 보고가 끝난 최종 실패다.
 * 여기서 재시도하면 재발급이 중복 트리거되고 보고가 배수로 늘어난다 → 재시도 없음.
 * 그 외(네트워크 단절 등 TypeError)는 1회만.
 */
export const shouldRetryQuery = (failureCount: number, error: unknown) =>
  error instanceof RequestError ? false : failureCount < 1;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 영속 대상은 gcTime ≥ maxAge여야 한다. gcTime이 짧으면 앱을 켜둔 채 오래 머물 때 메모리에서
      // GC되고, 다음 저장 시점에 디스크 캐시에서도 빠져 콜드 복원이 비게 된다.
      // 값 리소스는 합쳐도 수 KB라 메모리 비용은 없다. 큰 리소스(strokes 포함)는 정의 자리에서 5분으로 줄인다.
      gcTime: PERSIST_MAX_AGE,
      retry: shouldRetryQuery,
      // WebView 포커스 이벤트를 신뢰하기 어렵고, 전면 광고 오버레이가 닫힐 때 focus가 튀어 불필요한 갱신이 나간다.
      refetchOnWindowFocus: false,
    },
  },
});

// localStorage는 Android WebView 설정에 따라 null일 수 있다 — persister가 no-op으로 흡수한다.
const readLocalStorage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

// 모듈 초기화 시점(= App import 시점, createRoot().render()보다 앞)에 동기 복원한다.
setupQueryPersistence(
  queryClient,
  createLocalStoragePersister(readLocalStorage()),
);

// 로그아웃·재발급 실패 = 사용자 경계. 메모리 캐시를 비우면 구독이 빈 상태를 디스크에도 쓴다.
onSessionCleared(() => queryClient.clear());
