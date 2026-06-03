import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { QuestService } from "./quest.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  CurrentUser,
  type CurrentUserPayload,
} from "../auth/decorators/current-user.decorator";
import { MyQuestsResponseDto } from "./dto/my-quests-response.dto";
import { ObjectiveType } from "./entity/quest.entity";
import { ZodValidationPipe } from "src/common/zod-validation.pipe";
import { QuestActionSchema, type QuestAction } from "@toss/shared";

const ACTION_TYPE_TO_OBJECTIVE: Record<string, ObjectiveType> = {
  visit_ranking: ObjectiveType.VISIT_RANKING,
  visit_podium: ObjectiveType.VISIT_PODIUM,
  visit_quest_tab: ObjectiveType.VISIT_QUEST_TAB,
  visit_drawing_detail: ObjectiveType.VISIT_DRAWING_DETAIL,
  share: ObjectiveType.SHARE,
  retry: ObjectiveType.RETRY,
};

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

  @Post("/quests/me")
  @ApiOperation({ summary: "오늘의 퀘스트 할당" })
  @ApiResponse({ status: 201, description: "퀘스트 할당 완료" })
  @ApiResponse({ status: 401, description: "인증 실패" })
  async assignMyQuests(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<MyQuestsResponseDto> {
    return this.questService.assignOrGetQuests(user.userKey);
  }

  @Post("/quests/action")
  @ApiOperation({ summary: "퀘스트 액션 보고 (페이지 방문/공유/재시도)" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["actionType"],
      properties: {
        actionType: {
          type: "string",
          enum: [
            "visit_ranking",
            "visit_podium",
            "visit_quest_tab",
            "visit_drawing_detail",
            "share",
            "retry",
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: "액션 처리 완료" })
  @ApiResponse({ status: 401, description: "인증 실패" })
  async reportAction(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(QuestActionSchema)) body: QuestAction,
  ): Promise<void> {
    const objectiveType = ACTION_TYPE_TO_OBJECTIVE[body.actionType];
    if (!objectiveType) return;

    await this.questService.onTutorialAction(user.userKey, objectiveType);
  }
}
