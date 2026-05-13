import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { PromptResponse } from "@toss/shared";
import { getTodayKst } from "src/common/util/today";
import {
  CurrentUser,
  type CurrentUserPayload,
} from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PlayService } from "./play.service";

@ApiTags("Play")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("plays")
export class PlayController {
  constructor(private readonly playService: PlayService) {}

  @Post("start")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "플레이 시작 및 오늘의 프롬프트 반환" })
  @ApiOkResponse({
    description: "기회 1회 소비 후 프롬프트 반환 { promptId, strokes }",
  })
  @ApiUnauthorizedResponse({ description: "인증이 필요해요." })
  @ApiConflictResponse({ description: "그리기 기회가 부족해요." })
  @ApiNotFoundResponse({ description: "오늘 날짜에 배정된 프롬프트 없음" })
  start(@CurrentUser() user: CurrentUserPayload): Promise<PromptResponse> {
    return this.playService.start(user.userKey, getTodayKst());
  }
}
