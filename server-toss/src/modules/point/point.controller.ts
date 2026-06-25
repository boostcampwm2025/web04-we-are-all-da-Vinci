import { Controller, Get, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { SchemaObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import type { PointSummaryResponse } from "@toss/shared";
import {
  CurrentUser,
  type CurrentUserPayload,
} from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PointService } from "./point.service";

const PointSummarySchema: SchemaObject = {
  type: "object",
  properties: {
    totalPoints: { type: "integer", minimum: 0 },
    todayPoints: { type: "integer", minimum: 0 },
  },
  required: ["totalPoints", "todayPoints"],
};

@ApiTags("Point")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("points")
export class PointController {
  constructor(private readonly pointService: PointService) {}

  @Get("me")
  @ApiOperation({ summary: "받은 포인트 요약 (누적/오늘, 진행 중 지급 포함)" })
  @ApiOkResponse({ description: "포인트 요약", schema: PointSummarySchema })
  @ApiUnauthorizedResponse({ description: "인증이 필요해요." })
  getMyPointSummary(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<PointSummaryResponse> {
    return this.pointService.getPointSummary(user.userKey);
  }
}
