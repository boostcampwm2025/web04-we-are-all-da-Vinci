/**
 * E2E 테스트 모드 감지
 * 개발 환경에서만 localStorage 플래그를 확인하여 테스트 모드 여부 반환
 * 프로덕션 환경에서는 항상 false 반환 (보안)
 */
export const isE2ETestMode = (): boolean => {
  // 프로덕션 환경에서는 항상 false
  if (import.meta.env.PROD) {
    return false;
  }

  // 개발 환경에서만 localStorage 플래그 확인
  try {
    return localStorage.getItem('e2eTest') === 'true';
  } catch {
    return false;
  }
};
