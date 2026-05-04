import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { PinoLogger } from "nestjs-pino";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly logger: PinoLogger,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException("로그인이 필요해요.");
    }

    let payload: { sub: number };
    try {
      payload = this.jwtService.verify<{ sub: number }>(token);
    } catch {
      throw new UnauthorizedException(
        "인증이 만료됐어요. 다시 로그인해주세요.",
      );
    }

    request.user = { userKey: payload.sub };
    this.logger.assign({ userKey: payload.sub });
    return true;
  }

  private extractToken(request: Request): string | undefined {
    const auth = request.headers.authorization;
    if (!auth?.startsWith("Bearer ")) return undefined;
    return auth.slice(7);
  }
}
