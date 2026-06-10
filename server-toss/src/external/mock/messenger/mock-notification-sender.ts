import { Injectable, Logger } from "@nestjs/common";
import { NotificationSender } from "src/modules/notification/port/notification-sender.interface";
import type {
  BulkSendMessageInput,
  SendMessageInput,
  TossMessengerResponse,
} from "src/modules/notification/schemas/toss-messenger.schema";

@Injectable()
export class MockNotificationSender extends NotificationSender {
  private readonly logger = new Logger(MockNotificationSender.name);

  sendMessage(input: SendMessageInput): Promise<TossMessengerResponse> {
    this.logger.debug(
      {
        event: "notification.send.succeeded",
        adapter: "mock",
        userKey: input.userKey,
        templateSetCode: input.templateSetCode,
      },
      "Mock 알림 발송 완료",
    );
    return Promise.resolve({ resultType: "SUCCESS" });
  }

  sendBulkMessage(input: BulkSendMessageInput): Promise<TossMessengerResponse> {
    this.logger.debug(
      {
        event: "notification.bulk.succeeded",
        adapter: "mock",
        templateSetCode: input.templateSetCode,
        targetCount: input.contextList.length,
      },
      "Mock 알림 대량 발송 완료",
    );
    return Promise.resolve({ resultType: "SUCCESS" });
  }
}
