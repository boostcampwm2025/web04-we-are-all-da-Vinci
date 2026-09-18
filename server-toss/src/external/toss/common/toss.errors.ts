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

type ErrorCodeValue = {
  readonly errorCode: string;
  readonly description: string;
};

export const TossBusinessErrorCode = {
  BAD_REQUEST: {
    errorCode: "4000",
    description: "잘못된 요청입니다.",
  },
  PROMOTION_NOT_FOUND: {
    errorCode: "4100",
    description: "프로모션 정보를 찾을 수 없어요",
  },
  PROMOTION_NOT_APPROVED: {
    errorCode: "4108",
    description: "프로모션이 승인되지 않았어요",
  },
  PROMOTION_NOT_RUNNING: {
    errorCode: "4109",
    description: "프로모션이 실행중이 아니에요",
  },
  REWARD_AMOUNT_EXCEEDED: {
    errorCode: "4114",
    description:
      "프로모션에 설정된 1회 지급 금액을 초과해서 지급할 수 없습니다.",
  },
  INSUFFICIENT_PROMOTION_MONEY: {
    errorCode: "4112",
    description: "프로모션 머니가 부족해요",
  },
  PROMOTION_ENDED: {
    errorCode: "4105",
    description: "프로모션이 종료되어 있어요",
  },
  ALREADY_PROCESSED: {
    errorCode: "4113",
    description: "이미 지급/회수된 내역이에요",
  },
  REWARD_PROCESS_FAILED: {
    errorCode: "4110",
    description: "리워드를 지급/회수할 수 없어요",
  },
  WORKSPACE_NOT_FOUND_OR_FORBIDDEN: {
    errorCode: "4034",
    description:
      "워크스페이스가 없거나 워크스페이스에 접근할 수 있는 권한이 없어요",
  },
  AUTHENTICATION_NOT_FOUND: {
    errorCode: "4010",
    description: "인증 정보를 찾을 수 없어요.",
  },
  RATE_LIMIT_EXCEEDED: {
    errorCode: "4095",
    description: "요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.",
  },
  REWARD_PROCESS_NOT_FOUND: {
    errorCode: "4111",
    description: "리워드 지급내역을 찾을 수 없어요",
  },
} as const satisfies Record<string, ErrorCodeValue>;
