import { REWARD_POINT } from "@toss/shared";

// 미션·마일스톤 등 server-toss 내부는 이 모듈 SSOT(REWARD_POINT)를 참조한다(루트 SSOT는 @toss/shared).
export { REWARD_POINT };
export const PROMOTION_AMOUNT = REWARD_POINT;
export const PROMOTION_MAX_RETRIES = 3;
export const PURGE_BATCH_SIZE = 100;
export const SUCCEEDED_RETENTION_DAYS = 7;
export const FAILED_RETENTION_DAYS = 30;
