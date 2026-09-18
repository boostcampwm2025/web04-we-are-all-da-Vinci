import {
  TossBusinessErrorCode,
  TossPromotionError,
} from "../common/toss.errors";
import { TOSS_API_ENDPOINTS } from "../common/toss-api.constants";
import { TossPointGrantExecuter } from "./toss-point-grant.executer";

const setup = () => {
  const request = jest.fn();
  const configService = {
    getOrThrow: jest.fn((key: string) =>
      key === "TOSS_API_KEY" ? "api-key" : "promotion-code",
    ),
    get: jest.fn(() => "test"),
  };
  const executer = new TossPointGrantExecuter(
    { request } as never,
    configService as never,
  );

  return { executer, request };
};

describe("토스 포인트 지급 결과 조회", () => {
  it.each(["PENDING", "SUCCESS", "FAILED"] as const)(
    "지급 결과가 %s이면 그대로 반환한다",
    async (result) => {
      const { executer, request } = setup();
      request.mockResolvedValue({ resultType: "SUCCESS", success: result });

      await expect(executer.getPromotionResult(1234, "key")).resolves.toBe(
        result,
      );
      expect(request).toHaveBeenCalledWith(
        "POST",
        TOSS_API_ENDPOINTS.GET_PROMOTION_RESULT,
        expect.objectContaining({ "x-toss-user-key": "1234" }),
        JSON.stringify({ promotionCode: "TEST_promotion-code", key: "key" }),
      );
    },
  );

  it("지급 내역이 없으면 null을 반환한다", async () => {
    const { executer, request } = setup();
    request.mockResolvedValue({
      resultType: "FAIL",
      error: {
        errorCode: TossBusinessErrorCode.REWARD_PROCESS_NOT_FOUND.errorCode,
        reason: TossBusinessErrorCode.REWARD_PROCESS_NOT_FOUND.description,
      },
    });

    await expect(executer.getPromotionResult(1234, "key")).resolves.toBeNull();
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
