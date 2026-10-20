import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { readFileSync } from "fs";
import https from "https";
import {
  TossApiError,
  TossTransportError,
} from "src/external/toss/common/toss.errors";

@Injectable()
export class TossHttpClient {
  private readonly logger = new Logger(TossHttpClient.name);
  private readonly baseUrl: string;
  private readonly httpsAgent: https.Agent;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.getOrThrow<string>("TOSS_API_BASE_URL");

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

  request<T>(
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
        clearTimeout(deadline);

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
        clearTimeout(deadline);
        resolve(data);
      };

      const req = https.request(
        {
          hostname: url.hostname,
          path: url.pathname,
          method,
          headers,
          agent: this.httpsAgent,
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
      // 소켓 비활동 시간이 아니라 연결·응답 본문 수신을 포함한 전체 시간을 제한한다.
      const deadline = setTimeout(() => {
        const error = new TossTransportError(
          "Toss API 요청이 타임아웃됐습니다",
        );
        req.destroy(error);
        fail(error);
      }, 10_000);
      req.on("error", (err) => fail(new TossTransportError(err.message)));
      if (body) req.write(body);
      req.end();
    });
  }
}
