import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { readFileSync } from "fs";
import https from "https";
import type { LoginDto } from "src/modules/auth/dto/login.dto";
import type {
  TossTokenResponse,
  TossUserResponse,
  TossUserInfo,
} from "src/modules/auth/types/toss-api.types";
import { TOSS_API_ENDPOINTS } from "src/modules/auth/constants/toss-api.constants";

export type { TossUserInfo };

@Injectable()
export class TossApiClient {
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

  private request<T>(
    method: string,
    path: string,
    headers: Record<string, string>,
    body?: string,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const url = new URL(`${this.baseUrl}${path}`);
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
            try {
              resolve(JSON.parse(data) as T);
            } catch {
              reject(new Error(`Invalid JSON: ${data}`));
            }
          });
        },
      );
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Toss API request timed out"));
      });
      req.on("error", reject);
      if (body) req.write(body);
      req.end();
    });
  }
}
