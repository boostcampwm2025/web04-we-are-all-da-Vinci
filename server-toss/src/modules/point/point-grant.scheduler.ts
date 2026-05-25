import { Injectable, Logger } from "@nestjs/common";
import { PointService } from "./point.service";
import { Cron, CronExpression } from "@nestjs/schedule";

@Injectable()
export class PointGrantScheduler {
  private readonly logger = new Logger(PointGrantScheduler.name);

  constructor(private readonly pointService: PointService) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async processEligiblePoints() {
    // PENDING, RETRY 상태의 요청 조회 + 상태 업데이트(예: PENDING → PROCESSING, RETRY → PROCESSING) + flush를 하나의 트랜잭션으로 처리하여 데이터 일관성 보장
    await this.pointService.lockAndFetchEligibleGrants();
    // 각 요청에 대해 handlePendingRequest 또는 handleRetryRequest 호출

    // Promise.allSettled 등을 활용 처리 및 개별 요청 실패 시 전체 작업 실패 방지
    // TODO: 요청 성공 시 상태 업데이트 및 로그 기록 or 요청 실패 시 상태 업데이트, 재시도 횟수 증가, 로그 기록

    // TODO: 재시도 횟수 초과 시 상태 업데이트 및 로그 기록
    // TODO: 예외 처리 및 전체 작업 실패 방지
  }
}
