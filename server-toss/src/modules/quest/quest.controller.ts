import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { QuestService } from "./quest.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  CurrentUser,
  type CurrentUserPayload,
} from "../auth/decorators/current-user.decorator";
import { MyQuestsResponseDto } from "./dto/my-quests-response.dto";

@ApiTags("Quest")
@UseGuards(JwtAuthGuard)
@Controller()
export class QuestController {
  constructor(private readonly questService: QuestService) {}

  @Get("/quests/me")
  @ApiOperation({ summary: "내 퀘스트 목록 조회" })
  @ApiResponse({ status: 200, description: "퀘스트 목록 반환" })
  @ApiResponse({ status: 401, description: "인증 실패" })
  async getMyQuests(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<MyQuestsResponseDto> {
    return this.questService.myQuests(user.userKey);
  }
}
