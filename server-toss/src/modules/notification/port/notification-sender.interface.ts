import type {
  BulkSendMessageInput,
  SendMessageInput,
  TossMessengerResponse,
} from "../schemas/toss-messenger.schema";

// 알림 발송 포트. 실제 구현(Toss 어댑터/Mock)은 external 레이어에서 바인딩한다.
// NotificationService는 이 추상 클래스 토큰으로 주입받는다.
export abstract class NotificationSender {
  abstract sendMessage(input: SendMessageInput): Promise<TossMessengerResponse>;
  abstract sendBulkMessage(
    input: BulkSendMessageInput,
  ): Promise<TossMessengerResponse>;
}
