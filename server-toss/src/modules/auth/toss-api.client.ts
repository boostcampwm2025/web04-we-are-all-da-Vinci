import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { readFileSync } from "fs";
import https from "https";
import { TOSS_API_ENDPOINTS } from "src/modules/auth/constants/toss-api.constants";
import type { LoginDto } from "src/modules/auth/dto/login.dto";
import {
  TossApiError,
  TossPromotionError,
  TossTransportError,
} from "src/modules/auth/errors/toss.errors";
import {
  type BulkSendMessageInput,
  type SendMessageInput,
  type TossMessengerResponse,
  TossMessengerResponseSchema,
} from "src/modules/auth/schemas/toss-messenger.schema";
import type {
  TossPromotionExecuteResponse,
  TossPromotionKeyResponse,
  TossTokenResponse,
  TossUserInfo,
  TossUserResponse,
} from "src/modules/auth/types/toss-api.types";

export type { TossUserInfo };

@Injectable()
export class TossApiClient {
  private readonly logger = new Logger(TossApiClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly httpsAgent: https.Agent;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.getOrThrow<string>("TOSS_API_BASE_URL");
    this.apiKey = this.configService.getOrThrow<string>("TOSS_API_KEY");

    const certPath = this.configService.getOrThrow<string>(
      "TOSS_CLIENT_CERT_PATH",
    );
    const keyPath = this.configService.getOrThrow<string>(
      "TOSS_CLIENT_KEY_PATH",
    );
    this.httpsAgent = new https.Agent({
      cert: readFileSync(certPath),
      key: readFileSync(keyPath),
      rejectUnauthorized: true,
    });
  }

  async generateToken(dto: LoginDto): Promise<string> {
    const data = await this.request<TossTokenResponse>(
      "POST",
      TOSS_API_ENDPOINTS.GENERATE_TOKEN,
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      JSON.stringify({
        authorizationCode: dto.authorizationCode,
        referrer: dto.referrer,
      }),
    );

    if (data.resultType !== "SUCCESS" || !data.success) {
      throw new UnauthorizedException(
        data.error?.reason ?? "토큰 발급에 실패했어요.",
      );
    }

    return data.success.accessToken;
  }

  async removeAccessByUserKey(userKey: number): Promise<void> {
    const data = await this.request<{
      resultType: string;
      success?: unknown;
      error?: { reason?: string };
    }>(
      "POST",
      TOSS_API_ENDPOINTS.REMOVE_BY_USER_KEY,
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      JSON.stringify({ userKey }),
    );

    if (data.resultType !== "SUCCESS") {
      throw new UnauthorizedException(
        data.error?.reason ?? "Toss access 제거에 실패했어요.",
      );
    }
  }

  async getUserInfo(accessToken: string): Promise<TossUserInfo> {
    const data = await this.request<TossUserResponse>(
      "GET",
      TOSS_API_ENDPOINTS.LOGIN_ME,
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    );

    if (data.resultType !== "SUCCESS" || !data.success) {
      throw new UnauthorizedException(
        data.error?.reason ?? "유저 정보 조회에 실패했어요.",
      );
    }

    return data.success;
  }

  async getPromotionKey(userKey: number): Promise<string> {
    const data = await this.request<TossPromotionKeyResponse>(
      "POST",
      TOSS_API_ENDPOINTS.PROMOTION_GET_KEY,
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "x-toss-user-key": String(userKey),
      },
    );

    if (data.resultType !== "SUCCESS" || !data.success) {
      throw new TossPromotionError(
        data.error?.errorCode ?? "UNKNOWN",
        data.error?.reason ?? "프로모션 키 발급에 실패했어요.",
      );
    }

    return data.success.key;
  }

  async sendMessage(input: SendMessageInput): Promise<TossMessengerResponse> {
    const { userKey, templateSetCode, context } = input;

    const raw = await this.request<unknown>(
      "POST",
      TOSS_API_ENDPOINTS.SEND_MESSAGE,
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "x-toss-user-key": String(userKey),
      },
      JSON.stringify({ templateSetCode, context }),
    );

    const parsed = TossMessengerResponseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new TossTransportError(
        `Toss 메신저 응답 형식이 올바르지 않아요: ${parsed.error.message}`,
      );
    }

    return parsed.data;
  }

  async sendBulkMessage(
    input: BulkSendMessageInput,
  ): Promise<TossMessengerResponse> {
    const { templateSetCode, contextList } = input;

    const raw = await this.request<unknown>(
      "POST",
      TOSS_API_ENDPOINTS.SEND_BULK_MESSAGE,
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      JSON.stringify({ templateSetCode, contextList }),
    );

    const parsed = TossMessengerResponseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new TossTransportError(
        `Toss 메신저 응답 형식이 올바르지 않아요: ${parsed.error.message}`,
      );
    }

    return parsed.data;
  }

  async executePromotion(
    userKey: number,
    key: string,
    promotionCode: string,
    amount: number,
  ): Promise<void> {
    const data = await this.request<TossPromotionExecuteResponse>(
      "POST",
      TOSS_API_ENDPOINTS.EXECUTE_PROMOTION,
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "x-toss-user-key": String(userKey),
      },
      JSON.stringify({ promotionCode, key, amount }),
    );

    if (data.resultType !== "SUCCESS" || !data.success) {
      throw new TossPromotionError(
        data.error?.errorCode ?? "UNKNOWN",
        data.error?.reason ?? "프로모션 지급에 실패했어요.",
      );
    }
  }

  private request<T>(
    method: string,
    path: string,
    headers: Record<string, string>,
    body?: string,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      let settled = false;
      const url = new URL(`${this.baseUrl}${path}`);

      const fail = (error: Error, statusCode?: number) => {
        if (settled) return;
        settled = true;

        const logObject = {
          event: "toss_api.request.failed",
          method,
          path,
          statusCode,
          durationMs: Date.now() - startedAt,
          err: error,
        };

        if (statusCode && statusCode < 500) {
          this.logger.warn(logObject, "Toss API 요청 실패");
        } else {
          this.logger.error(logObject, "Toss API 요청 실패");
        }

        reject(error);
      };

      const succeed = (data: T) => {
        if (settled) return;
        settled = true;
        resolve(data);
      };

      const req = https.request(
        {
          hostname: url.hostname,
          path: url.pathname,
          method,
          headers,
          agent: this.httpsAgent,
          timeout: 10000,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk: Buffer) => (data += chunk.toString()));
          res.on("end", () => {
            if (res.statusCode && res.statusCode >= 400) {
              fail(new TossApiError(res.statusCode, data), res.statusCode);
              return;
            }
            try {
              succeed(JSON.parse(data) as T);
            } catch {
              fail(new TossTransportError(`Toss API 응답이 JSON이 아닙니다`));
            }
          });
        },
      );
      req.on("timeout", () => {
        const error = new TossTransportError(
          "Toss API 요청이 타임아웃됐습니다",
        );
        req.destroy(error);
        fail(error);
      });
      req.on("error", (err) => fail(new TossTransportError(err.message)));
      if (body) req.write(body);
      req.end();
    });
  }
}
