/** unknown 에러를 사용자/로그용 문자열 메시지로 변환한다. */
export const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
