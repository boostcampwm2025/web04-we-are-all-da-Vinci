import { EntityManager, RequestContext } from "@mikro-orm/core";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { getTodayKst } from "src/common/util/today";
import { getSeoulDateKey, getSeoulDayRange } from "src/common/util/time.util";
import { PromptService } from "../prompt/prompt.service";
import {
  BULK_MESSAGE_MIN_RECIPIENTS,
  NOTIFICATION_TYPE,
} from "./notification.constants";
import { NotificationService } from "./notification.service";
import { SentNotificationRepository } from "./sent-notification.repository";

// 일일 제시 그림 알림 발송 시각(KST, 정각). 로컬 검증용으로 .env.local에서
// DAILY_PROMPT_CRON 환경변수로 식을 오버라이드할 수 있다 (예: "* * * * *").
// 데코레이터는 클래스 로드 시점에 평가되므로 NestJS 부팅 전에 dotenv가
// 환경변수를 채우는 흐름을 신뢰한다.
const DAILY_PROMPT_SEND_HOUR_KST = 18;
const DEFAULT_DAILY_PROMPT_CRON = `0 ${DAILY_PROMPT_SEND_HOUR_KST} * * *`;
const DAILY_PROMPT_CRON =
  process.env.DAILY_PROMPT_CRON ?? DEFAULT_DAILY_PROMPT_CRON;

@Injectable()
export class DailyPromptNotificationScheduler {
  private readonly logger = new Logger(DailyPromptNotificationScheduler.name);

  constructor(
    private readonly em: EntityManager,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
    private readonly sentNotificationRepository: SentNotificationRepository,
    private readonly promptService: PromptService,
  ) {}

  // @Cron은 HTTP 요청 밖이라 RequestContext(fork em)가 없다. RequestContext.create로
  // 감싸 이 작업 전용 em 컨텍스트를 만든다. 없으면 allowGlobalContext=false에서
  // 내부 em 작업이 ValidationError로 막힌다.
  @Cron(DAILY_PROMPT_CRON, { timeZone: "Asia/Seoul" })
  async handleDailyPromptBroadcast(): Promise<void> {
    await RequestContext.create(this.em, () => this.run());
  }

  /** 테스트에서 직접 호출하기 위한 진입점 */
  async run(): Promise<void> {
    if (
      this.configService.get<string>("DAILY_PROMPT_NOTIFICATION_ENABLED") !==
      "true"
    ) {
      this.logger.log(
        { event: "daily_prompt.scheduler.skipped", reason: "feature_disabled" },
        "일일 제시 그림 알림 발송이 비활성화되어 스킵해요.",
      );
      return;
    }

    const templateSetCode = this.configService.getOrThrow<string>(
      "TOSS_TEMPLATE_DAILY_PROMPT",
    );
    const agreementTemplateCode = templateSetCode;
    const todayRange = getSeoulDayRange();
    const referenceId = getSeoulDateKey(todayRange.start);

    try {
      await this.promptService.getPromptByDate(getTodayKst());
    } catch (err) {
      if (err instanceof NotFoundException) {
        this.logger.log(
          {
            event: "daily_prompt.scheduler.skipped",
            reason: "prompt_not_found",
            referenceId,
          },
          "오늘 제시 그림이 없어 발송 스킵해요.",
        );
        return;
      }

      this.logger.error(
        { event: "daily_prompt.scheduler.failed", reason: "prompt_check", err },
        "오늘 제시 그림 확인에 실패해 발송 스킵해요.",
      );
      return;
    }

    let userKeys: number[];
    try {
      userKeys =
        await this.sentNotificationRepository.findAgreedUserKeysWithNoDrawingIn(
          {
            range: todayRange,
            type: NOTIFICATION_TYPE.DAILY_PROMPT,
            referenceId,
            agreementTemplateCode,
          },
        );
    } catch (err) {
      this.logger.error(
        {
          event: "daily_prompt.scheduler.failed",
          reason: "target_query",
          err,
          referenceId,
        },
        "발송 대상 조회에 실패했어요.",
      );
      return;
    }

    if (userKeys.length === 0) {
      this.logger.log(
        {
          event: "daily_prompt.scheduler.skipped",
          reason: "no_target",
          referenceId,
        },
        "오늘 미참여 사용자가 없어 발송 스킵해요.",
      );
      return;
    }

    if (userKeys.length >= BULK_MESSAGE_MIN_RECIPIENTS) {
      try {
        const result = await this.notificationService.sendBulk({
          targets: userKeys.map((userKey) => ({ userKey, context: {} })),
          type: NOTIFICATION_TYPE.DAILY_PROMPT,
          referenceId,
          templateSetCode,
        });

        this.logger.log(
          {
            event: "daily_prompt.scheduler.completed",
            mode: "bulk",
            referenceId,
            total: userKeys.length,
            ...result,
          },
          "오늘의 제시 그림 알림 대량 발송이 끝났어요.",
        );
      } catch (err) {
        this.logger.error(
          {
            event: "daily_prompt.scheduler.failed",
            reason: "bulk",
            referenceId,
            total: userKeys.length,
            err,
          },
          "오늘의 제시 그림 알림 대량 발송 준비에 실패했어요.",
        );
      }
      return;
    }

    let sentCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const userKey of userKeys) {
      try {
        const result = await this.notificationService.send({
          targetUserKey: userKey,
          type: NOTIFICATION_TYPE.DAILY_PROMPT,
          referenceId,
          templateSetCode,
          context: {},
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
            event: "daily_prompt.scheduler.failed",
            reason: "send",
            userKey,
            referenceId,
            err,
          },
          "사용자 발송에 실패해 다음 사용자로 넘어가요.",
        );
      }
    }

    this.logger.log(
      {
        event: "daily_prompt.scheduler.completed",
        mode: "single",
        referenceId,
        total: userKeys.length,
        sentCount,
        skippedCount,
        failedCount,
      },
      "오늘의 제시 그림 알림 발송이 끝났어요.",
    );
  }
}
