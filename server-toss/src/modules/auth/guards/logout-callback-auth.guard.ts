import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";
import { timingSafeEqual } from "node:crypto";

@Injectable()
export class LogoutCallbackAuthGuard implements CanActivate {
  private readonly authUsername: string;
  private readonly authPassword: string;

  constructor(private readonly configService: ConfigService) {
    this.authUsername = this.configService.getOrThrow<string>(
      "TOSS_CALLBACK_BASIC_AUTH_USERNAME",
    );
    this.authPassword = this.configService.getOrThrow<string>(
      "TOSS_CALLBACK_BASIC_AUTH_PASSWORD",
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const auth = this.extractAuth(request);

    const originBuf = Buffer.from(`${this.authUsername}:${this.authPassword}`);
    const decodedBuf = Buffer.from(
      Buffer.from(auth, "base64").toString("utf-8"),
    );

    if (
      originBuf.length !== decodedBuf.length ||
      !timingSafeEqual(originBuf, decodedBuf)
    ) {
      throw new UnauthorizedException("인증 헤더가 일치하지 않아요.");
    }

    return true;
  }

  private extractAuth(request: Request): string {
    const auth = request.headers.authorization;
    if (!auth?.startsWith("Basic ")) {
      throw new UnauthorizedException("Basic 인증이 필요해요.");
    }
    return auth.slice(6);
  }
}
