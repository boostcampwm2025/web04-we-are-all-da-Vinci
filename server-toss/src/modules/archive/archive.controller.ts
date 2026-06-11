import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  ArchiveDateParamSchema,
  type ArchiveDateParam,
  type ArchiveDayResponse,
  type ArchiveSummaryResponse,
} from "@toss/shared";
import { ZodValidationPipe } from "src/common/zod-validation.pipe";
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

  @Get("days/:date")
  @ApiOperation({
    summary: "내 그림 아카이브 날짜별 상세 조회",
    description:
      "KST 기준 어제까지의 특정 날짜 제시그림, 내 그림, 최종 등수를 조회합니다.",
  })
  @ApiOkResponse({
    description: "아카이브 날짜별 상세",
  })
  async findDay(
    @CurrentUser() user: CurrentUserPayload,
    @Param(new ZodValidationPipe(ArchiveDateParamSchema))
    { date }: ArchiveDateParam,
  ): Promise<ArchiveDayResponse> {
    return this.archiveService.findDay(user.userKey, date);
  }
}
