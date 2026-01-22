/**
 * CORS origin 검증을 위한 유틸리티
 * 환경 변수에 설정된 origin과 Netlify 프리뷰 URL을 허용합니다.
 */

const NETLIFY_PREVIEW_PATTERN =
  /^https:\/\/deploy-preview-\d+--[\w-]+\.netlify\.app$/;

/**
 * 주어진 origin이 허용되는지 확인합니다.
 */
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return true; // 서버 간 요청 허용
  }

  const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];

  // 환경 변수에 설정된 origin 확인
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // Netlify 프리뷰 URL 패턴 확인
  if (NETLIFY_PREVIEW_PATTERN.test(origin)) {
    return true;
  }

  return false;
}

/**
 * NestJS/Express CORS origin 콜백 함수
 */
export function corsOriginCallback(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
): void {
  if (isAllowedOrigin(origin)) {
    callback(null, true);
  } else {
    callback(new Error('CORS 오류입니다.'));
  }
}

/**
 * Socket.IO CORS 설정용 origin 배열 또는 함수 반환
 */
export function getSocketCorsOrigin(): (string | RegExp)[] {
  const origins: (string | RegExp)[] =
    process.env.CORS_ORIGIN?.split(',') || [];
  origins.push(NETLIFY_PREVIEW_PATTERN);
  return origins;
}
