import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";

export type AcquireResult = {
  success: "SUCCESS" | "FAILED";
  remainingPoints: number;
  msBeforeNext: number;
};

export enum KEY_PREFIX {
  KEY_ISSUE = "key_issue",
  EXECUTE_PROMOTION = "execute_promotion",
  RESULT = "result",
  USER_PROMOTION = "user_promotion",
}

@Injectable()
export class PromotionRateLimiter {
  private readonly apiLimiter: RateLimiterMemory;
  private readonly userLimiter: RateLimiterMemory;

  constructor(private readonly configService: ConfigService) {
    const apiThreshold = Number(
      this.configService.get<string | number>("RL_API_THRESHOLD") ?? 3000,
    );
    const apiWindow = Number(
      this.configService.get<string | number>("RL_API_WINDOW") ?? 60,
    );
    const userThreshold = Number(
      this.configService.get<string | number>("RL_USER_THRESHOLD") ?? 1,
    );
    const userWindow = Number(
      this.configService.get<string | number>("RL_USER_WINDOW") ?? 3,
    );

    this.validatePositiveInteger("RL_API_THRESHOLD", apiThreshold);
    this.validatePositiveInteger("RL_API_WINDOW", apiWindow);
    this.validatePositiveInteger("RL_USER_THRESHOLD", userThreshold);
    this.validatePositiveInteger("RL_USER_WINDOW", userWindow);

    this.apiLimiter = new RateLimiterMemory({
      points: apiThreshold,
      duration: apiWindow,
    });
    this.userLimiter = new RateLimiterMemory({
      points: userThreshold,
      duration: userWindow,
    });
  }

  acquireApi(
    apiKey: Exclude<KEY_PREFIX, KEY_PREFIX.USER_PROMOTION>,
  ): Promise<AcquireResult> {
    return this.acquire(this.apiLimiter, apiKey);
  }

  acquireUser(userId: string): Promise<AcquireResult> {
    const userKey = `${KEY_PREFIX.USER_PROMOTION}:${userId}`;
    return this.acquire(this.userLimiter, userKey);
  }

  recoverApi(apiKey: Exclude<KEY_PREFIX, KEY_PREFIX.USER_PROMOTION>) {
    return this.apiLimiter.reward(apiKey, 1);
  }

  private validatePositiveInteger(key: string, value: number): void {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`${key}는 양수 정수여야 합니다`);
    }
  }

  private async acquire(
    limiter: RateLimiterMemory,
    key: string,
  ): Promise<AcquireResult> {
    let success: AcquireResult["success"] = "SUCCESS";
    let res: RateLimiterRes;
    try {
      res = await limiter.consume(key, 1);
    } catch (err) {
      if (!(err instanceof RateLimiterRes)) {
        throw err;
      }
      success = "FAILED";
      res = err;
    }
    return {
      success,
      remainingPoints: res.remainingPoints,
      msBeforeNext: res.msBeforeNext,
    };
  }
}
