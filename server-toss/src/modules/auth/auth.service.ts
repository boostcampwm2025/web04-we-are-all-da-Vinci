import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createDecipheriv } from "crypto";
import { UserService } from "src/modules/user/user.service";
import { TossApiClient } from "src/modules/auth/toss-api.client";
import type { LoginDto } from "src/modules/auth/dto/login.dto";
import type { LoginResponseDto } from "src/modules/auth/dto/login-response.dto";
import {
  TossApiError,
  TossTransportError,
} from "src/modules/auth/errors/toss.errors";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly decryptKey: string;
  private readonly decryptAad: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly tossApiClient: TossApiClient,
    private readonly userService: UserService,
  ) {
    this.decryptKey = this.configService.getOrThrow<string>("TOSS_DECRYPT_KEY");
    this.decryptAad =
      this.configService.get<string>("TOSS_DECRYPT_AAD") ?? "TOSS";
  }

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    let accessToken: string;
    let userInfo: Awaited<ReturnType<TossApiClient["getUserInfo"]>>;

    try {
      accessToken = await this.tossApiClient.generateToken(dto);
      userInfo = await this.tossApiClient.getUserInfo(accessToken);
    } catch (err) {
      if (err instanceof TossTransportError) {
        this.logger.error(err, "Toss API 통신 오류");
        throw new ServiceUnavailableException("Toss API에 연결할 수 없어요.");
      }
      if (err instanceof TossApiError) {
        this.logger.error(err, `Toss API 오류 (HTTP ${err.statusCode})`);
        throw new BadGatewayException("Toss API 오류가 발생했어요.");
      }
      throw err; // UnauthorizedException (resultType === "FAIL")
    }

    let name: string;
    let gender: string | undefined;
    let birthday: Date | undefined;

    try {
      name = userInfo.name ? this.decrypt(userInfo.name) : "알 수 없음";
      gender = userInfo.gender ? this.decrypt(userInfo.gender) : undefined;
      birthday = userInfo.birthday
        ? this.parseBirthday(this.decrypt(userInfo.birthday))
        : undefined;
    } catch (err) {
      this.logger.error(err, "사용자 정보 복호화 실패");
      throw new InternalServerErrorException(
        "사용자 정보 복호화에 실패했어요.",
      );
    }

    try {
      await this.userService.upsert({
        userKey: userInfo.userKey,
        name,
        gender,
        birthday,
      });
    } catch (err) {
      this.logger.error(err, "사용자 정보 저장 실패");
      throw new InternalServerErrorException("사용자 정보 저장에 실패했어요.");
    }

    return { userKey: userInfo.userKey };
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
}
