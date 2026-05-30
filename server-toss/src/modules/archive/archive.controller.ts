import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { ArchiveSummaryResponse } from "@toss/shared";
import {
  CurrentUser,
  type CurrentUserPayload,
} from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ArchiveService } from "./archive.service";

@ApiTags("Archive")
@UseGuards(JwtAuthGuard)
@Controller("archive")
export class ArchiveController {
  constructor(private readonly archiveService: ArchiveService) {}

  @Get("summary")
  @ApiOperation({
    summary: "내 그림 아카이브 요약 조회",
    description:
      "KST 기준 어제까지의 날짜별 그림 수, 최고점, 최종 등수를 조회합니다.",
  })
  @ApiOkResponse({
    description: "아카이브 요약",
  })
  async findSummary(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ArchiveSummaryResponse> {
    return this.archiveService.findSummary(user.userKey);
  }
}
