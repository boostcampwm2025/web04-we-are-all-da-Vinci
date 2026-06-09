import { Injectable, Logger } from "@nestjs/common";
import { exponentialBackoff, withRetry } from "src/common/util/retry.util";
import {
  TossApiError,
  TossTransportError,
} from "src/modules/auth/errors/toss.errors";
import type { TossMessengerResponse } from "src/modules/auth/schemas/toss-messenger.schema";
import { TossApiClient } from "src/modules/auth/toss-api.client";
import {
  BULK_MESSAGE_MIN_RECIPIENTS,
  SENT_NOTIFICATION_STATUS,
  type NotificationType,
} from "./notification.constants";
import type { SentNotification } from "./sent-notification.entity";
import { SentNotificationRepository } from "./sent-notification.repository";

export type SendNotificationInput = {
  targetUserKey: number;
  type: NotificationType;
  referenceId: string;
  templateSetCode: string;
  context: Record<string, unknown>;
};

export type SendNotificationResult =
  | { sent: true }
  | { sent: false; reason: "already_sent" | "fail_response" };

export type SendBulkNotificationInput = {
  targets: Array<{
    userKey: number;
    context: Record<string, unknown>;
  }>;
  type: NotificationType;
  referenceId: string;
  templateSetCode: string;
};

export type SendBulkNotificationResult = {
  sentCount: number;
  skippedCount: number;
  failedCount: number;
  partialFailCount: number;
  bulkRequestCount: number;
  singleFallbackCount: number;
};

const FAIL_CHANNELS = [
  "sentPush",
  "sentInbox",
  "sentSms",
  "sentAlimtalk",
  "sentFriendtalk",
] as const;

const BULK_MESSAGE_MAX_RECIPIENTS = 2500;

// 토스 메신저는 Idempotency-Key 미지원. timeout만 재시도하면 중복 발송 위험이
// 있지만 분포상 드물고(수% 미만), 그래도 안 보내는 것보다 보냄이 우선이라
// transport-level transient 에러는 3회까지 재시도. 5xx도 함께.
const SEND_RETRY_MAX_ATTEMPTS = 3;
const SEND_RETRY_BACKOFF_BASE_MS = 1000;

const isRetryableSendError = (err: unknown): boolean => {
  if (err instanceof TossTransportError) return true; // timeout / network / parse-fail
  if (err instanceof TossApiError && err.statusCode >= 500) return true;
  return false;
};

// 재시도 사유. 현재는 로그(onRetry)에만 쓰인다.
type RetryReason = "timeout" | "server5xx" | "network";

const classifyRetryReason = (err: unknown): RetryReason => {
  if (err instanceof TossApiError && err.statusCode >= 500) return "server5xx";
  if (err instanceof TossTransportError) {
    const msg = err.message.toLowerCase();
    if (msg.includes("타임아웃") || msg.includes("timeout")) return "timeout";
    return "network";
  }
  return "network";
};

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly sentNotificationRepository: SentNotificationRepository,
    private readonly tossApiClient: TossApiClient,
  ) {}

  async send(input: SendNotificationInput): Promise<SendNotificationResult> {
    const record = await this.reserve(input.targetUserKey, input);

    if (record === false) {
      this.logger.debug(
        {
          event: "notification.send.skipped",
          targetUserKey: input.targetUserKey,
          type: input.type,
          referenceId: input.referenceId,
        },
        "이미 발송된 알림이라 스킵해요.",
      );
      return { sent: false, reason: "already_sent" };
    }

    try {
      const result = await this.deliverWithRetry(input, record);

      if (result.sent) {
        await this.sentNotificationRepository.updateStatus(
          record,
          SENT_NOTIFICATION_STATUS.DELIVERED,
        );
        return { sent: true };
      }

      await this.sentNotificationRepository.updateStatus(
        record,
        SENT_NOTIFICATION_STATUS.FAILED,
      );
      return { sent: false, reason: result.reason };
    } catch (err) {
      await this.sentNotificationRepository.updateStatus(
        record,
        SENT_NOTIFICATION_STATUS.FAILED,
      );
      this.logger.error(
        {
          event: "notification.send.failed",
          reason: "transport_exhausted",
          targetUserKey: input.targetUserKey,
          type: input.type,
          referenceId: input.referenceId,
          err,
        },
        "재시도 후에도 토스 메신저 호출이 실패했어요.",
      );
      throw err;
    }
  }

  async sendBulk(
    input: SendBulkNotificationInput,
  ): Promise<SendBulkNotificationResult> {
    // 청크 파이프라인: [reserve → 발송 → status → em.clear()] 를 청크 단위로 반복한다.
    // reserve 결과(record)를 한 번에 다 쌓아두면 identity map이 누적되어 flush마다
    // 전체 dirty check가 일어나 O(N²)로 악화된다. 청크가 끝날 때마다 em.clear()로
    // identity map을 비워 dirty check 범위를 청크 크기로 고정 → 전체 O(N) 선형 유지.
    const em = this.sentNotificationRepository.getEntityManager();

    let sentCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    let partialFailCount = 0;
    let bulkRequestCount = 0;
    let singleFallbackCount = 0;

    for (
      let offset = 0;
      offset < input.targets.length;
      offset += BULK_MESSAGE_MAX_RECIPIENTS
    ) {
      const chunk = input.targets.slice(
        offset,
        offset + BULK_MESSAGE_MAX_RECIPIENTS,
      );

      const reservedTargets: Array<{
        userKey: number;
        context: Record<string, unknown>;
        record: SentNotification;
      }> = [];
      for (const target of chunk) {
        const record = await this.reserve(target.userKey, input);
        if (record === false) {
          skippedCount += 1;
          continue;
        }
        reservedTargets.push({ ...target, record });
      }

      if (reservedTargets.length > 0) {
        // 한 청크에 남은 수신자가 토스 대량 발송 최소 인원 미만이면 단건으로 보낸다.
        if (reservedTargets.length < BULK_MESSAGE_MIN_RECIPIENTS) {
          const result = await this.deliverReservedSingles(
            input,
            reservedTargets,
          );
          sentCount += result.sentCount;
          failedCount += result.failedCount;
          partialFailCount += result.partialFailCount;
          singleFallbackCount += reservedTargets.length;
        } else {
          const result = await this.deliverReservedBulkChunk(
            input,
            reservedTargets,
          );
          sentCount += result.sentCount;
          failedCount += result.failedCount;
          partialFailCount += result.partialFailCount;
          bulkRequestCount += 1;
        }
      }

      // 청크 처리 완료 → identity map 비움(O(N²) 방지). status 갱신은 이미 끝나
      // record가 detach돼도 안전하다.
      em.clear();
    }

    return {
      sentCount,
      skippedCount,
      failedCount,
      partialFailCount,
      bulkRequestCount,
      singleFallbackCount,
    };
  }

  private async reserve(
    userKey: number,
    input: Pick<SendNotificationInput, "type" | "referenceId">,
  ): Promise<SentNotification | false> {
    return this.sentNotificationRepository.tryInsert({
      userKey,
      type: input.type,
      referenceId: input.referenceId,
      sentAt: new Date(),
    });
  }

  // withRetry 안에서 deliverReservedSingle을 감싼다.
  // 성공 응답이나 비즈니스 실패(fail_response)는 throw하지 않으므로 재시도 안 됨.
  // transport 에러만 throw → withRetry가 재시도.
  private deliverWithRetry(
    input: SendNotificationInput,
    record: SentNotification,
  ) {
    return withRetry(() => this.deliverReservedSingle(input, record), {
      maxAttempts: SEND_RETRY_MAX_ATTEMPTS,
      isRetryable: isRetryableSendError,
      backoffMs: exponentialBackoff(SEND_RETRY_BACKOFF_BASE_MS, 0.25),
      onRetry: (err, attempt) => {
        const reason = classifyRetryReason(err);
        this.logger.warn(
          {
            event: "notification.send.retry",
            targetUserKey: input.targetUserKey,
            type: input.type,
            referenceId: input.referenceId,
            attempt,
            reason,
            err,
          },
          "토스 메신저 호출이 실패해 재시도해요.",
        );
      },
    });
  }

  private async deliverReservedSingle(
    input: SendNotificationInput,
    record: SentNotification,
  ): Promise<
    | { sent: true; partialFailCount: number }
    | { sent: false; reason: "fail_response"; partialFailCount: number }
  > {
    // record는 status 추적용. transport error는 throw → withRetry가 재시도.
    // 비즈니스 실패(resultType≠SUCCESS)는 throw 안 함 → 재시도 안 됨.
    const response: TossMessengerResponse =
      await this.tossApiClient.sendMessage({
        userKey: input.targetUserKey,
        templateSetCode: input.templateSetCode,
        context: input.context,
      });

    if (response.resultType !== "SUCCESS") {
      this.logger.warn(
        {
          event: "notification.send.failed",
          reason: "fail_response",
          targetUserKey: input.targetUserKey,
          type: input.type,
          referenceId: input.referenceId,
          recordId: Number(record.id),
          resultType: response.resultType,
          errorCode: response.error?.errorCode,
          errorReason: response.error?.reason,
        },
        "토스가 발송 실패로 응답했어요.",
      );
      return {
        sent: false,
        reason: "fail_response",
        partialFailCount: 0,
      };
    }

    const reachFails = this.collectReachFails(response);
    if (reachFails.length > 0) {
      this.logger.warn(
        {
          event: "notification.send.succeeded",
          reason: "partial_reach_fail",
          targetUserKey: input.targetUserKey,
          type: input.type,
          referenceId: input.referenceId,
          recordId: Number(record.id),
          reachFails,
        },
        "일부 채널에서 도달 실패가 발생했어요.",
      );
    }

    return { sent: true, partialFailCount: reachFails.length };
  }

  private async deliverReservedSingles(
    input: SendBulkNotificationInput,
    reservedTargets: Array<{
      userKey: number;
      context: Record<string, unknown>;
      record: SentNotification;
    }>,
  ): Promise<{
    sentCount: number;
    failedCount: number;
    partialFailCount: number;
  }> {
    let sentCount = 0;
    let failedCount = 0;
    let partialFailCount = 0;

    for (const target of reservedTargets) {
      const singleInput: SendNotificationInput = {
        targetUserKey: target.userKey,
        type: input.type,
        referenceId: input.referenceId,
        templateSetCode: input.templateSetCode,
        context: target.context,
      };

      try {
        const result = await this.deliverWithRetry(singleInput, target.record);

        if (result.sent) {
          await this.sentNotificationRepository.updateStatus(
            target.record,
            SENT_NOTIFICATION_STATUS.DELIVERED,
          );
          sentCount += 1;
        } else {
          await this.sentNotificationRepository.updateStatus(
            target.record,
            SENT_NOTIFICATION_STATUS.FAILED,
          );
          failedCount += 1;
        }
        partialFailCount += result.partialFailCount;
      } catch (err) {
        await this.sentNotificationRepository.updateStatus(
          target.record,
          SENT_NOTIFICATION_STATUS.FAILED,
        );
        failedCount += 1;
        this.logger.error(
          {
            event: "notification.bulk.failed",
            reason: "single_fallback",
            targetUserKey: target.userKey,
            type: input.type,
            referenceId: input.referenceId,
            err,
          },
          "대량 발송 fallback 단건 호출이 재시도 후에도 실패했어요.",
        );
      }
    }

    return {
      sentCount,
      failedCount,
      partialFailCount,
    };
  }

  private async deliverReservedBulkChunk(
    input: SendBulkNotificationInput,
    reservedTargets: Array<{
      userKey: number;
      context: Record<string, unknown>;
      record: SentNotification;
    }>,
  ): Promise<{
    sentCount: number;
    failedCount: number;
    partialFailCount: number;
  }> {
    // 청크 통째로 withRetry. 청크의 일부만 재시도하는 건 토스 API 설계상 불가능.
    let response: TossMessengerResponse;
    try {
      response = await withRetry(
        () =>
          this.tossApiClient.sendBulkMessage({
            templateSetCode: input.templateSetCode,
            contextList: reservedTargets.map((target) => ({
              userKey: target.userKey,
              context: target.context,
            })),
          }),
        {
          maxAttempts: SEND_RETRY_MAX_ATTEMPTS,
          isRetryable: isRetryableSendError,
          backoffMs: exponentialBackoff(SEND_RETRY_BACKOFF_BASE_MS, 0.25),
          onRetry: (err, attempt) => {
            const reason = classifyRetryReason(err);
            this.logger.warn(
              {
                event: "notification.bulk.retry",
                type: input.type,
                referenceId: input.referenceId,
                targetCount: reservedTargets.length,
                attempt,
                reason,
                err,
              },
              "토스 대량 메신저 호출이 실패해 재시도해요.",
            );
          },
        },
      );
    } catch (err) {
      await this.sentNotificationRepository.updateStatusMany(
        reservedTargets.map((target) => target.record),
        SENT_NOTIFICATION_STATUS.FAILED,
      );
      this.logger.error(
        {
          event: "notification.bulk.failed",
          reason: "transport_exhausted",
          type: input.type,
          referenceId: input.referenceId,
          targetCount: reservedTargets.length,
          err,
        },
        "재시도 후에도 토스 대량 메신저 호출이 실패했어요.",
      );
      return {
        sentCount: 0,
        failedCount: reservedTargets.length,
        partialFailCount: 0,
      };
    }

    if (response.resultType !== "SUCCESS") {
      await this.sentNotificationRepository.updateStatusMany(
        reservedTargets.map((target) => target.record),
        SENT_NOTIFICATION_STATUS.FAILED,
      );
      this.logger.warn(
        {
          event: "notification.bulk.failed",
          reason: "fail_response",
          type: input.type,
          referenceId: input.referenceId,
          targetCount: reservedTargets.length,
          resultType: response.resultType,
          errorCode: response.error?.errorCode,
          errorReason: response.error?.reason,
        },
        "토스가 대량 발송 실패로 응답했어요.",
      );
      return {
        sentCount: 0,
        failedCount: reservedTargets.length,
        partialFailCount: 0,
      };
    }

    await this.sentNotificationRepository.updateStatusMany(
      reservedTargets.map((target) => target.record),
      SENT_NOTIFICATION_STATUS.DELIVERED,
    );

    const reachFails = this.collectReachFails(response);
    if (reachFails.length > 0) {
      this.logger.warn(
        {
          event: "notification.bulk.succeeded",
          reason: "partial_reach_fail",
          type: input.type,
          referenceId: input.referenceId,
          targetCount: reservedTargets.length,
          reachFails,
        },
        "대량 발송 일부 채널에서 도달 실패가 발생했어요.",
      );
    }

    return {
      sentCount: reservedTargets.length,
      failedCount: 0,
      partialFailCount: reachFails.length,
    };
  }

  private collectReachFails(response: TossMessengerResponse) {
    if (!response.result) return [];
    const fail = response.result.fail;
    return FAIL_CHANNELS.flatMap((channel) =>
      fail[channel].map((item) => ({
        channel,
        contentId: item.contentId,
        reason: item.reachFailReason,
      })),
    );
  }
}
