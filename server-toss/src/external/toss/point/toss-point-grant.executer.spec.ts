import { ConfigService } from "@nestjs/config";
import {
  KEY_PREFIX,
  PromotionRateLimiter,
} from "../../rate-limiter/promotion-rate-limiter";
import {
  TossBusinessErrorCode,
  TossPromotionError,
  TossRateLimitError,
} from "../common/toss.errors";
import { TOSS_API_ENDPOINTS } from "../common/toss-api.constants";
import { TossPointGrantExecuter } from "./toss-point-grant.executer";

const setup = () => {
  const request = jest
    .fn()
    .mockResolvedValue({ resultType: "SUCCESS", success: true });
  const configService = new ConfigService({
    TOSS_API_KEY: "api-key",
    PROMOTION_CODE: "promotion-code",
    NODE_ENV: "test",
    RL_API_THRESHOLD: 2,
    RL_API_WINDOW: 60,
    RL_USER_THRESHOLD: 1,
    RL_USER_WINDOW: 3,
  });
  const rateLimiter = new PromotionRateLimiter(configService);
  const executer = new TossPointGrantExecuter(
    { request } as never,
    configService,
    rateLimiter,
  );

  return { executer, request, rateLimiter };
};

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe("토스 포인트 지급 호출량 제한", () => {
  it.each([
    ["지급", KEY_PREFIX.EXECUTE_PROMOTION],
    ["결과 조회", KEY_PREFIX.RESULT],
  ] as const)(
    "%s API 한도 초과면 HTTP 요청 없이 대기 시간을 전달한다",
    async (_label, key) => {
      const { executer, request, rateLimiter } = setup();
      await rateLimiter.acquireApi(key);
      await rateLimiter.acquireApi(key);
      jest.advanceTimersByTime(1000);

      const result =
        key === KEY_PREFIX.EXECUTE_PROMOTION
          ? executer.executePromotion(1234, "key", 2)
          : executer.getPromotionResult(1234, "key");

      await expect(result).rejects.toEqual(
        new TossRateLimitError(59000, "요청 한도 초과"),
      );
      expect(request).not.toHaveBeenCalled();
    },
  );

  it("사용자 한도 초과면 HTTP 요청 없이 API quota를 복구하여 다른 사용자의 지급을 허용한다", async () => {
    const { executer, request } = setup();
    await executer.executePromotion(1234, "first-key", 2);

    await expect(
      executer.executePromotion(1234, "blocked-key", 2),
    ).rejects.toEqual(new TossRateLimitError(3000, "요청 한도 초과"));
    expect(request).toHaveBeenCalledTimes(1);

    await expect(
      executer.executePromotion(5678, "other-user-key", 2),
    ).resolves.toBeUndefined();
    expect(request).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenLastCalledWith(
      "POST",
      TOSS_API_ENDPOINTS.EXECUTE_PROMOTION,
      expect.objectContaining({ "x-toss-user-key": "5678" }),
      JSON.stringify({
        promotionCode: "TEST_promotion-code",
        key: "other-user-key",
        amount: 2,
      }),
    );

    await expect(
      executer.executePromotion(9012, "exhausted-key", 2),
    ).rejects.toEqual(new TossRateLimitError(60000, "요청 한도 초과"));
    expect(request).toHaveBeenCalledTimes(2);
  });
});

describe("토스 포인트 지급 결과 조회", () => {
  it.each(["PENDING", "SUCCESS", "FAILED"] as const)(
    "지급 결과가 %s이면 객체 계약으로 반환한다",
    async (result) => {
      const { executer, request } = setup();
      request.mockResolvedValue({ resultType: "SUCCESS", success: result });

      await expect(executer.getPromotionResult(1234, "key")).resolves.toEqual({
        type: result,
      });
      expect(request).toHaveBeenCalledWith(
        "POST",
        TOSS_API_ENDPOINTS.GET_PROMOTION_RESULT,
        expect.objectContaining({ "x-toss-user-key": "1234" }),
        JSON.stringify({ promotionCode: "TEST_promotion-code", key: "key" }),
      );
    },
  );

  it("지급 내역이 없으면 NOT_FOUND 객체를 반환한다", async () => {
    const { executer, request } = setup();
    request.mockResolvedValue({
      resultType: "FAIL",
      error: {
        errorCode: TossBusinessErrorCode.REWARD_PROCESS_NOT_FOUND.errorCode,
        reason: TossBusinessErrorCode.REWARD_PROCESS_NOT_FOUND.description,
      },
    });

    await expect(executer.getPromotionResult(1234, "key")).resolves.toEqual({
      type: "NOT_FOUND",
    });
  });

  it("지급 내역 없음 이외의 실패 응답이면 프로모션 오류를 던진다", async () => {
    const { executer, request } = setup();
    request.mockResolvedValue({
      resultType: "FAIL",
      error: {
        errorCode: TossBusinessErrorCode.REWARD_PROCESS_FAILED.errorCode,
        reason: TossBusinessErrorCode.REWARD_PROCESS_FAILED.description,
      },
    });

    await expect(executer.getPromotionResult(1234, "key")).rejects.toEqual(
      new TossPromotionError("4110", "리워드를 지급/회수할 수 없어요"),
    );
  });
});
