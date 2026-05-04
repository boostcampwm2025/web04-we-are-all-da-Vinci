import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { CurrentUserPayload } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AdService } from "./ad.service";

@ApiTags("adviews")
@Controller("adviews")
export class AdController {
  constructor(private readonly adService: AdService) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "광고 시청 기록 저장",
    description:
      "리워드 광고 시청 완료 후 drawing 타입 광고 시청 기록을 저장해요.",
  })
  async recordAdView(@CurrentUser() user: CurrentUserPayload): Promise<void> {
    await this.adService.recordDrawingAdView(user.userKey);
  }
}
