import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@mikro-orm/nestjs";
import { EntityManager } from "@mikro-orm/mysql";
import { createDecipheriv } from "crypto";
import { readFileSync } from "fs";
import https from "https";
import { User } from "src/modules/user/user.entity";
import { UserRepository } from "src/modules/user/user.repository";
import type { LoginDto } from "src/modules/auth/dto/login.dto";

interface TossTokenResponse {
  resultType: "SUCCESS" | "FAIL";
  success?: {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
    scope: string;
  };
  error?: {
    errorCode: string;
    reason: string;
  };
}

interface TossUserResponse {
  resultType: "SUCCESS" | "FAIL";
  success?: {
    userKey: number;
    scope: string;
    agreedTerms: string[];
    name?: string;
    phone?: string;
    birthday?: string;
    ci?: string;
    di?: null;
    gender?: string;
    nationality?: string;
    email?: string | null;
  };
  error?: {
    errorCode: string;
    reason: string;
  };
}

@Injectable()
export class AuthService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly decryptKey: string;
  private readonly decryptAad: string;
  private readonly httpsAgent: https.Agent;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: UserRepository,
    private readonly em: EntityManager,
  ) {
    this.baseUrl = this.configService.getOrThrow<string>("TOSS_API_BASE_URL");
    this.apiKey = this.configService.getOrThrow<string>("TOSS_API_KEY");
    this.decryptKey = this.configService.getOrThrow<string>("TOSS_DECRYPT_KEY");
    this.decryptAad =
      this.configService.get<string>("TOSS_DECRYPT_AAD") ?? "TOSS";

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

  async login(dto: LoginDto): Promise<{ userKey: number }> {
    // sandbox/개발 환경: mock-code로 테스트 (운영 환경에서는 비활성화)
    const isNonProduction =
      this.configService.get<string>("NODE_ENV") !== "production";
    if (isNonProduction && dto.authorizationCode === "mock-code") {
      const mockUserKey = 99999;
      await this.upsertUser({ userKey: mockUserKey, name: "테스트유저" });
      return { userKey: mockUserKey };
    }

    const accessToken = await this.generateToken(dto);
    const userInfo = await this.getUserInfo(accessToken);

    let name: string;
    let gender: string | undefined;
    let birthday: Date | undefined;

    try {
      name = userInfo.name ? this.decrypt(userInfo.name) : "알 수 없음";
      gender = userInfo.gender ? this.decrypt(userInfo.gender) : undefined;
      birthday = userInfo.birthday
        ? this.parseBirthday(this.decrypt(userInfo.birthday))
        : undefined;
    } catch {
      throw new InternalServerErrorException(
        "사용자 정보 복호화에 실패했어요.",
      );
    }

    try {
      await this.upsertUser({
        userKey: userInfo.userKey,
        name,
        gender,
        birthday,
      });
    } catch {
      throw new InternalServerErrorException("사용자 정보 저장에 실패했어요.");
    }

    return { userKey: userInfo.userKey };
  }

  private tossRequest<T>(
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

  private async generateToken(dto: LoginDto): Promise<string> {
    const data = await this.tossRequest<TossTokenResponse>(
      "POST",
      "/api-partner/v1/apps-in-toss/user/oauth2/generate-token",
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

  private async getUserInfo(
    accessToken: string,
  ): Promise<NonNullable<TossUserResponse["success"]>> {
    const data = await this.tossRequest<TossUserResponse>(
      "GET",
      "/api-partner/v1/apps-in-toss/user/oauth2/login-me",
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

  private decrypt(encryptedText: string): string {
    const IV_LENGTH = 12;
    const decoded = Buffer.from(encryptedText, "base64");
    const key = Buffer.from(this.decryptKey, "base64");
    const iv = decoded.subarray(0, IV_LENGTH);
    const tag = decoded.subarray(decoded.length - 16);
    const ciphertext = decoded.subarray(IV_LENGTH, decoded.length - 16);

    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    decipher.setAAD(Buffer.from(this.decryptAad));

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf-8");
  }

  private parseBirthday(raw: string): Date | undefined {
    if (!/^\d{8}$/.test(raw)) return undefined;
    const year = parseInt(raw.slice(0, 4), 10);
    const month = parseInt(raw.slice(4, 6), 10) - 1;
    const day = parseInt(raw.slice(6, 8), 10);
    const date = new Date(year, month, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month ||
      date.getDate() !== day
    ) {
      return undefined;
    }
    return date;
  }

  private async upsertUser(data: {
    userKey: number;
    name: string;
    gender?: string;
    birthday?: Date;
  }): Promise<void> {
    let user = await this.userRepository.findOne({ userKey: data.userKey });

    if (!user) {
      user = this.userRepository.create({
        userKey: data.userKey,
        name: data.name,
        gender: data.gender,
        birthday: data.birthday,
      });
      this.em.persist(user);
    } else {
      user.name = data.name;
      if (data.gender !== undefined) user.gender = data.gender;
      if (data.birthday !== undefined) user.birthday = data.birthday;
    }

    await this.em.flush();
  }
}
