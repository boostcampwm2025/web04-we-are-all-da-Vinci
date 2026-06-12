import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { MissionActionSchema, type MissionAction } from "@toss/shared";
import { ZodValidationPipe } from "src/common/zod-validation.pipe";
import {
  CurrentUser,
  type CurrentUserPayload,
} from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { MyMissionsResponseDto } from "./dto/my-missions-response.dto";
import { ACTION_TYPE_TO_OBJECTIVE } from "./mission.constants";
import { MissionService } from "./service/mission.service";

@ApiTags("Mission")
@UseGuards(JwtAuthGuard)
@Controller()
export class MissionController {
  constructor(private readonly missionService: MissionService) {}

  @Get("/missions/me")
  @ApiOperation({ summary: "내 미션 목록 조회" })
  @ApiResponse({ status: 200, description: "미션 목록 반환" })
  @ApiResponse({ status: 401, description: "인증 실패" })
  async getMyMissions(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<MyMissionsResponseDto> {
    return this.missionService.myMissions(user.userKey);
  }

  @Post("/missions/me")
  @HttpCode(201)
  @ApiOperation({ summary: "오늘의 미션 할당" })
  @ApiResponse({ status: 201, description: "미션 할당 완료" })
  @ApiResponse({ status: 401, description: "인증 실패" })
  async assignMyMissions(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<MyMissionsResponseDto> {
    return this.missionService.assignAndGetMyMissions(user.userKey);
  }

  @Post("/missions/action")
  @HttpCode(201)
  @ApiOperation({ summary: "미션 액션 보고 (페이지 방문/공유/재시도)" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["actionType"],
      properties: {
        actionType: {
          type: "string",
          enum: [
            "visit_ranking",
            "visit_mission_tab",
            "visit_drawing_detail",
            "share",
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: "액션 처리 완료" })
  @ApiResponse({ status: 401, description: "인증 실패" })
  async reportAction(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(MissionActionSchema)) body: MissionAction,
  ): Promise<void> {
    const objectiveType = ACTION_TYPE_TO_OBJECTIVE[body.actionType];
    if (!objectiveType) return;

    await this.missionService.onActionReported(user.userKey, { objectiveType });
  }
}
