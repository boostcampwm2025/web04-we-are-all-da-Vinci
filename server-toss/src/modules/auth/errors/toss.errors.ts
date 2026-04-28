/** 네트워크 타임아웃, 소켓 오류, 비JSON 응답 등 transport 레벨 오류 */
export class TossTransportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TossTransportError";
  }
}

/** Toss API가 HTTP 4xx / 5xx 를 반환한 경우 */
export class TossApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "TossApiError";
  }
}
