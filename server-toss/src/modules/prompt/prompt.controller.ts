import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { PromptResponse } from "@toss/shared";
import { getTodayKst } from "src/common/util/today";
import { PromptService } from "./prompt.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  CurrentUser,
  type CurrentUserPayload,
} from "../auth/decorators/current-user.decorator";

@ApiTags("Prompt")
@Controller("prompt")
@UseGuards(JwtAuthGuard)
export class PromptController {
  constructor(private readonly promptService: PromptService) {}

  @Get()
  @ApiOperation({ summary: "오늘의 기준 프롬프트 조회 (KST)" })
  @ApiResponse({
    status: 200,
    description: "프롬프트 반환 { promptId, strokes }",
  })
  @ApiResponse({ status: 404, description: "오늘 날짜에 배정된 프롬프트 없음" })
  async getTodaysPrompt(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<PromptResponse> {
    return this.promptService.getDailyPrompt(user.userKey, getTodayKst());
  }
}
