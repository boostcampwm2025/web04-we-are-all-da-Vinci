import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";

@ApiTags("auth")
@Controller("oauth/toss")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "토스 로그인",
    description:
      "appLogin()에서 받은 authorizationCode로 토스 사용자 인증 후 userKey를 반환해요.",
  })
  async login(@Body() dto: LoginDto): Promise<{ userKey: number }> {
    return this.authService.login(dto);
  }
}
