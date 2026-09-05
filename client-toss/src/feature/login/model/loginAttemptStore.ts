import { LOGIN_ATTEMPT_KEY } from "../config/constants";

// sessionStorage는 WebView 설정에 따라 접근 자체가 throw할 수 있다 — 전부 try/catch로 흡수한다.
const readStorage = (): Storage | null => {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

/** 이번 세션의 누적 로그인 실패 회차. 기록이 없거나 손상됐으면 0. */
export const readLoginAttempt = (): number => {
  try {
    const raw = readStorage()?.getItem(LOGIN_ATTEMPT_KEY);
    if (raw === null || raw === undefined) return 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
  } catch {
    return 0;
  }
};

/** 회차를 1 올려 저장하고 새 회차를 돌려준다. 저장이 막혀 있어도 회차는 돌려준다. */
export const incrementLoginAttempt = (): number => {
  const next = readLoginAttempt() + 1;
  try {
    readStorage()?.setItem(LOGIN_ATTEMPT_KEY, String(next));
  } catch {
    // 저장소가 막혀 있으면 이번 호출의 값만 쓴다.
  }
  return next;
};

/** 로그인 성공 시 호출한다. */
export const resetLoginAttempt = (): void => {
  try {
    readStorage()?.removeItem(LOGIN_ATTEMPT_KEY);
  } catch {
    // 지우지 못해도 다음 성공에서 다시 시도한다.
  }
};
