/**
 * HTTP 4xx/5xx 최종 실패. `request()` 안에서 401 재발급·Sentry 보고가 이미 끝난 뒤 던져진다.
 * queryClient의 retry 분기가 이 타입으로 "재시도 금지"를 판단하므로 shared/lib에 의존하지 않는
 * 리프 파일로 둔다(serverToss.ts는 shared/lib를 import한다).
 */
export class RequestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "RequestError";
  }
}
