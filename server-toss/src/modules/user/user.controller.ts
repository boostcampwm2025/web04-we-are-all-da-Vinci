import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/modules/auth/guards/jwt-auth.guard";
import { CurrentUser } from "src/modules/auth/decorators/current-user.decorator";
import type { CurrentUserPayload } from "src/modules/auth/decorators/current-user.decorator";
import { UserService } from "./user.service";
import { UserInfoResponseDto } from "./dto/user-info-response.dto";

@ApiTags("user")
@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "내 정보 조회",
    description: "JWT로 인증된 사용자의 정보를 반환해요.",
  })
  async getMe(@CurrentUser() user: CurrentUserPayload): Promise<UserInfoResponseDto> {
    const { userKey, name, gender, birthday } = await this.userService.getUserInfo(user.userKey);
    return { userKey, name, gender, birthday };
  }
}
