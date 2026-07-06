import { EntityManager } from "@mikro-orm/core";
import { CreateRequestContext } from "@mikro-orm/decorators/legacy";
import { InjectRepository } from "@mikro-orm/nestjs";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OnEvent } from "@nestjs/event-emitter";
import {
  RankingChangedEvent,
  RANKING_CHANGED_EVENT,
} from "src/modules/ranking/events/ranking-changed.event";
import { NotificationAgreement } from "../notification-agreement.entity";
import { NotificationAgreementRepository } from "../notification-agreement.repository";
import { NOTIFICATION_TYPE } from "../notification.constants";
import { NotificationService } from "../notification.service";

// 그림 제출로 랭킹이 갱신되면 추월된 사용자에게 OVERTAKEN 알림 발송.
// 발송 정책:
//   - TOP100 내 변동만 (overtakenUserKeys는 ranking.service에서 limit 100으로 잘림)
//   - 추월 사건당 1회 (referenceId = `${triggerDrawingId}_${userKey}` UNIQUE 자동 차단).
//     제출 그림 1건은 전역 유일이라, 같은 사람이라도 다른 제출로 다시 추월하면 매번 발송.
//     같은 이벤트가 중복 처리(재발행/재시도)되면 같은 키라 UNIQUE가 차단해 멱등 유지.
// 격리:
//   - @OnEvent async — 사용자 그림 제출 응답에 발송 시간 영향 X
//   - try/catch로 발송 실패가 다른 사용자에 전파되지 않도록 분리
@Injectable()
export class RankingChangedListener {
  private readonly logger = new Logger(RankingChangedListener.name);

  constructor(
    private readonly em: EntityManager,
    private readonly configService: ConfigService,
    @InjectRepository(NotificationAgreement)
    private readonly notificationAgreementRepository: NotificationAgreementRepository,
    private readonly notificationService: NotificationService,
  ) {}

  @CreateRequestContext((self: RankingChangedListener) => self.em)
  @OnEvent(RANKING_CHANGED_EVENT, { async: true, promisify: true })
  async handle(event: RankingChangedEvent): Promise<void> {
    try {
      await this.dispatch(event);
    } catch (err) {
      this.logger.error(
        {
          event: "overtaken.dispatch.handler_failed",
          triggerUserKey: event.triggerUserKey,
          triggerDrawingId: Number(event.triggerDrawingId),
          day: event.day,
          err,
        },
        "OVERTAKEN 핸들러 자체에서 예외 발생 — swallow 처리해요.",
      );
    }
  }

  private async dispatch(event: RankingChangedEvent): Promise<void> {
    if (
      this.configService.get<string>("OVERTAKEN_NOTIFICATION_ENABLED") !==
      "true"
    ) {
      this.logger.debug(
        { event: "overtaken.dispatch.disabled" },
        "OVERTAKEN 알림 발송이 비활성화되어 스킵해요.",
      );
      return;
    }

    if (event.overtakenUserKeys.length === 0) return;

    const templateSetCode = this.configService.getOrThrow<string>(
      "TOSS_TEMPLATE_OVERTAKEN",
    );

    const agreedUserKeys =
      await this.notificationAgreementRepository.findAgreedUserKeysAmong({
        userKeys: [...event.overtakenUserKeys],
        type: NOTIFICATION_TYPE.OVERTAKEN,
        templateCode: templateSetCode,
      });

    if (agreedUserKeys.length === 0) {
      this.logger.debug(
        {
          event: "overtaken.dispatch.no_agreed",
          overtakenCount: event.overtakenUserKeys.length,
          day: event.day,
        },
        "OVERTAKEN 알림 동의자가 없어 발송 스킵해요.",
      );
      return;
    }

    let sentCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    // 직렬 발송 — 토스 전체 rate limit 미공개 + I/O bound로 메인 프로세스 영향 작음.
    // 측정 후 마지막 사용자 지연이 가시화되면 p-limit으로 병렬화 검토.
    for (const userKey of agreedUserKeys) {
      try {
        const result = await this.notificationService.send({
          targetUserKey: userKey,
          // 추월 사건(제출 그림)+user별 referenceId → 추월당할 때마다 발송, 동일 이벤트는 멱등.
          referenceId: `${event.triggerDrawingId}_${userKey}`,
          type: NOTIFICATION_TYPE.OVERTAKEN,
          templateSetCode,
          context: {
            day: event.day,
            newRank: event.newRank,
          },
        });
        if (result.sent) {
          sentCount += 1;
        } else {
          skippedCount += 1;
        }
      } catch (err) {
        failedCount += 1;
        this.logger.error(
          {
            event: "overtaken.dispatch.failed",
            userKey,
            triggerUserKey: event.triggerUserKey,
            triggerDrawingId: Number(event.triggerDrawingId),
            day: event.day,
            err,
          },
          "OVERTAKEN 알림 발송에 실패했어요.",
        );
      }
    }

    this.logger.log(
      {
        event: "overtaken.dispatch.completed",
        triggerUserKey: event.triggerUserKey,
        triggerDrawingId: Number(event.triggerDrawingId),
        newRank: event.newRank,
        day: event.day,
        overtakenCount: event.overtakenUserKeys.length,
        agreedCount: agreedUserKeys.length,
        sentCount,
        skippedCount,
        failedCount,
      },
      "OVERTAKEN 알림 발송이 끝났어요.",
    );
  }
}
