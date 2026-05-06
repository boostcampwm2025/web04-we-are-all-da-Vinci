import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { CurrentUserPayload } from "src/modules/auth/decorators/current-user.decorator";
import { CurrentUser } from "src/modules/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "src/modules/auth/guards/jwt-auth.guard";
import { UserInfoResponseDto } from "./dto/user-info-response.dto";
import { UserService } from "./user.service";

@ApiTags("user")
@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "내 정보 조회",
    description: "JWT로 인증된 사용자의 정보를 반환해요.",
  })
  async getMe(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<UserInfoResponseDto> {
    const { userKey, name, nickname, gender, birthday } =
      await this.userService.getUserInfo(user.userKey);
    return { userKey, name, nickname, gender, birthday };
  }
}
