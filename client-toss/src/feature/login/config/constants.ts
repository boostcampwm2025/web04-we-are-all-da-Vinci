/** 동의 시트 뒤 WebView 리로드를 넘겨 "로그인 진행 중"을 기억한다. localStorage 키(기존 값 유지). */
export const LOGIN_PENDING_KEY = "login_pending";

/** 세션 누적 로그인 실패 회차. 동의 시트 리로드를 넘겨야 하므로 sessionStorage에 둔다. */
export const LOGIN_ATTEMPT_KEY = "login_attempt";

/**
 * 리로드 복귀 자동 재시도 상한. 재시도가 다시 리로드를 부르는 루프에서
 * 동의 시트가 끝없이 열리는 것을 막는다. 상한을 넘으면 사용자가 직접 누르게 둔다.
 */
export const MAX_PENDING_AUTO_RETRIES = 2;
