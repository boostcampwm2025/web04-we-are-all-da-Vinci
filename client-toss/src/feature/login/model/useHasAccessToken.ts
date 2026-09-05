import { hasAccessToken, onSessionCleared } from "@/shared/api";
import { useSyncExternalStore } from "react";

/**
 * 토큰 존재 여부를 구독한다.
 * `clearAccessToken()`이 세션 리스너를 부르면 스냅샷이 다시 읽혀 게이트가 닫힌다.
 * `setAccessToken`은 리스너를 부르지 않지만, 로그인 직후 `navigate("/")`로 보호 레이아웃이
 * 새로 마운트되며 스냅샷을 다시 읽으므로 따로 알릴 필요가 없다.
 */
export const useHasAccessToken = (): boolean =>
  useSyncExternalStore(onSessionCleared, hasAccessToken);
