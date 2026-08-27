import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ExternalPromotionError,
  ExternalTransportError,
} from "src/common/errors/external.errors";
import { PointGrantExecuter } from "src/modules/point/port/point-grant-executer.interface";

/**
 * 외부 API의 간헐적 실패를 시뮬레이션하는 Flaky Mock.
 *
 * - 이미 지급 완료된 키 → ExternalPromotionError 4113 (실제 토스 API 동작과 동일)
 * - MOCK_FLAKY_FAILURE_RATE 확률로 ExternalTransportError (네트워크 실패)
 * - 나머지 → 성공 (키를 granted 세트에 기록)
 *
 * 환경변수:
 * - MOCK_FLAKY_FAILURE_RATE: 실패 확률 0.0~1.0 (기본 0.4)
 * - MOCK_EXTERNAL_LATENCY_MS: 응답 지연 ms (기본 0)
 */
@Injectable()
export class FlakyPointGrantExecuter extends PointGrantExecuter {
  private readonly logger = new Logger(FlakyPointGrantExecuter.name);
  private readonly failureRate: number;
  private readonly latencyMs: number;
  private readonly grantedKeys = new Set<string>();

  constructor(configService: ConfigService) {
    super();
    this.failureRate = configService.get<number>(
      "MOCK_FLAKY_FAILURE_RATE",
      0.4,
    );
    this.latencyMs = configService.get<number>("MOCK_EXTERNAL_LATENCY_MS", 0);
  }

  async executePromotion(
    userKey: number,
    key: string,
    amount: number,
  ): Promise<void> {
    await this.delay();

    // 이미 지급된 키 → 4113 (멱등성 보장: 실제 토스 API와 동일한 동작)
    if (this.grantedKeys.has(key)) {
      this.logger.debug(
        { event: "flaky.promotion.already_granted", userKey, key },
        "이미 지급된 키 (4113)",
      );
      throw new ExternalPromotionError("4113", "이미 지급된 프로모션입니다");
    }

    // 확률적 실패 → ExternalTransportError (재시도 트리거)
    if (Math.random() < this.failureRate) {
      this.logger.debug(
        { event: "flaky.promotion.transport_failed", userKey, key },
        "Flaky 네트워크 실패 시뮬레이션",
      );
      throw new ExternalTransportError("flaky: 네트워크 타임아웃 시뮬레이션");
    }

    // 성공 → 키를 granted 세트에 기록
    this.grantedKeys.add(key);
    this.logger.debug(
      { event: "flaky.promotion.executed", userKey, key, amount },
      "Flaky 프로모션 지급 완료",
    );
  }

  private delay(): Promise<void> {
    if (this.latencyMs <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, this.latencyMs));
  }
}
