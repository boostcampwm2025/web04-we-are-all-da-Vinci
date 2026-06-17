import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ZodValidationPipe } from "src/common/zod-validation.pipe";
import { AuthService } from "./auth.service";
import type { CurrentUserPayload } from "./decorators/current-user.decorator";
import { CurrentUser } from "./decorators/current-user.decorator";
import { LoginResponseDto } from "./dto/login-response.dto";
import { LoginDto, LoginSchema } from "./dto/login.dto";
import {
  LogoutCallbackDto,
  LogoutCallbackSchema,
} from "./dto/logout-callback.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { LogoutCallbackAuthGuard } from "./guards/logout-callback-auth.guard";

@ApiTags("auth")
@Controller("oauth/toss")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "토스 로그인",
    description:
      "appLogin()에서 받은 authorizationCode로 토스 사용자 인증 후 JWT를 반환해요.",
  })
  async login(
    @Body(new ZodValidationPipe(LoginSchema)) dto: LoginDto,
  ): Promise<LoginResponseDto> {
    return this.authService.login(dto);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "토스 로그아웃",
    description: "Toss API에 연결 끊기를 요청하고 세션을 종료해요.",
  })
  async logout(@CurrentUser() user: CurrentUserPayload): Promise<void> {
    await this.authService.logout(user.userKey);
  }

  @Post("logout/callback")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(LogoutCallbackAuthGuard)
  async logoutCallback(
    @Body(new ZodValidationPipe(LogoutCallbackSchema)) dto: LogoutCallbackDto,
  ) {
    await this.authService.logoutByCallback(dto);
  }
}
