import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TOSS_API_ENDPOINTS } from "src/external/toss/common/toss-api.constants";
import {
  TossTokenResponse,
  TossUserInfo,
  TossUserResponse,
} from "src/external/toss/common/toss-api.types";
import { AuthClient } from "src/modules/auth/port/auth-client.interface";
import type { AuthLoginRequest } from "src/modules/auth/types/auth.types";
import { TossHttpClient } from "../common/toss-http.client";

@Injectable()
export class TossAuthClient implements AuthClient {
  private readonly apiKey: string;

  constructor(
    private readonly tossHttpClient: TossHttpClient,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.getOrThrow<string>("TOSS_API_KEY");
  }

  async generateToken(request: AuthLoginRequest): Promise<string> {
    const data = await this.tossHttpClient.request<TossTokenResponse>(
      "POST",
      TOSS_API_ENDPOINTS.GENERATE_TOKEN,
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      JSON.stringify({
        authorizationCode: request.authorizationCode,
        referrer: request.referrer,
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
    const data = await this.tossHttpClient.request<{
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
    const data = await this.tossHttpClient.request<TossUserResponse>(
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
}
