import {
  ExternalApiError,
  ExternalPromotionError,
  ExternalTransportError,
} from "src/common/errors/external.errors";

/** 네트워크 타임아웃, 소켓 오류, 비JSON 응답 등 transport 레벨 오류 */
export class TossTransportError extends ExternalTransportError {
  constructor(message: string) {
    super(message);
    this.name = "TossTransportError";
  }
}

/** Toss API가 HTTP 4xx / 5xx 를 반환한 경우 */
export class TossApiError extends ExternalApiError {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(statusCode, message);
    this.name = "TossApiError";
  }
}

/** 프로모션 API가 resultType: FAIL 을 반환한 경우 */
export class TossPromotionError extends ExternalPromotionError {
  constructor(
    public readonly errorCode: string,
    message: string,
  ) {
    super(errorCode, message);
    this.name = "TossPromotionError";
  }
}
