/** 네트워크 타임아웃, 소켓 오류 등 transport 레벨 오류 */
export class ExternalTransportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExternalTransportError";
  }
}

/** 외부 API가 HTTP 4xx/5xx를 반환한 경우 */
export class ExternalApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "ExternalApiError";
  }
}

/** 프로모션 API가 실패를 반환한 경우 */
export class ExternalPromotionError extends Error {
  constructor(
    public readonly errorCode: string,
    message: string,
  ) {
    super(message);
    this.name = "ExternalPromotionError";
  }
}
