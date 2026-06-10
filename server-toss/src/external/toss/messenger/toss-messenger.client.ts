import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotificationSender } from "src/modules/notification/port/notification-sender.interface";
import {
  type BulkSendMessageInput,
  type SendMessageInput,
  type TossMessengerResponse,
  TossMessengerResponseSchema,
} from "src/modules/notification/schemas/toss-messenger.schema";
import { TOSS_API_ENDPOINTS } from "../common/toss-api.constants";
import { TossHttpClient } from "../common/toss-http.client";
import { TossTransportError } from "../common/toss.errors";

@Injectable()
export class TossNotificationSender implements NotificationSender {
  private readonly apiKey: string;

  constructor(
    private readonly tossHttpClient: TossHttpClient,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.getOrThrow<string>("TOSS_API_KEY");
  }

  async sendMessage(input: SendMessageInput): Promise<TossMessengerResponse> {
    const { userKey, templateSetCode, context } = input;

    const raw = await this.tossHttpClient.request<unknown>(
      "POST",
      TOSS_API_ENDPOINTS.SEND_MESSAGE,
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "x-toss-user-key": String(userKey),
      },
      JSON.stringify({ templateSetCode, context }),
    );

    return this.parse(raw);
  }

  async sendBulkMessage(
    input: BulkSendMessageInput,
  ): Promise<TossMessengerResponse> {
    const { templateSetCode, contextList } = input;

    const raw = await this.tossHttpClient.request<unknown>(
      "POST",
      TOSS_API_ENDPOINTS.SEND_BULK_MESSAGE,
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      JSON.stringify({ templateSetCode, contextList }),
    );

    return this.parse(raw);
  }

  private parse(raw: unknown): TossMessengerResponse {
    const parsed = TossMessengerResponseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new TossTransportError(
        `Toss 메신저 응답 형식이 올바르지 않아요: ${parsed.error.message}`,
      );
    }
    return parsed.data;
  }
}
