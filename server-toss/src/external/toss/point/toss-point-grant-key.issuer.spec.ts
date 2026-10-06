import { ConfigService } from "@nestjs/config";
import { PromotionRateLimiter } from "../../rate-limiter/promotion-rate-limiter";
import { TOSS_API_ENDPOINTS } from "../common/toss-api.constants";
import { TossRateLimitError } from "../common/toss.errors";
import { TossPointGrantKeyIssuer } from "./toss-point-grant-key.issuer";

describe("토스 포인트 지급 키 발급 호출량 제한", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  const setup = () => {
    const config = new ConfigService({
      TOSS_API_KEY: "api-key",
      RL_API_THRESHOLD: 1,
      RL_API_WINDOW: 60,
    });
    const request = jest.fn().mockResolvedValue({
      resultType: "SUCCESS",
      success: { key: "promotion-key" },
    });
    const issuer = new TossPointGrantKeyIssuer(
      { request } as never,
      config,
      new PromotionRateLimiter(config),
    );
    return { issuer, request };
  };

  it("한도 내에서는 HTTP 요청으로 발급받은 키를 반환한다", async () => {
    const { issuer, request } = setup();

    await expect(issuer.getPromotionKey(1234)).resolves.toBe("promotion-key");

    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(
      "POST",
      TOSS_API_ENDPOINTS.PROMOTION_GET_KEY,
      expect.objectContaining({
        Authorization: "Bearer api-key",
        "x-toss-user-key": "1234",
      }),
    );
  });

  it("키 발급 API 한도 초과면 추가 HTTP 요청 없이 대기 시간을 전달한다", async () => {
    const { issuer, request } = setup();
    await issuer.getPromotionKey(1234);
    jest.advanceTimersByTime(1000);

    await expect(issuer.getPromotionKey(5678)).rejects.toEqual(
      new TossRateLimitError(59000, "요청 한도 초과"),
    );

    expect(request).toHaveBeenCalledTimes(1);
  });
});
