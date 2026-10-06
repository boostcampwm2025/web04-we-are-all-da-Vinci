import { Module } from "@nestjs/common";
import { PromotionRateLimiter } from "./promotion-rate-limiter";

@Module({ providers: [PromotionRateLimiter], exports: [PromotionRateLimiter] })
export class RateLimiterModule {}
