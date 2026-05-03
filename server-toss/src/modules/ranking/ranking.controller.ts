import { Controller, Get, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { RankingService } from "./ranking.service";
import {
  type MyRankingResponse,
  type RankingListResponse,
  type PodiumResponse,
} from "./types/ranking.type";
import {
  CurrentUser,
  type CurrentUserPayload,
} from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

const podiumResponseSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      name: { type: "string", example: "홍길동" },
      score: { type: "number", example: 91.25 },
    },
    required: ["name", "score"],
  },
};

const rankingListResponseSchema = {
  type: "object",
  properties: {
    updatedAt: {
      type: "string",
      example: "2026-04-18T00:00:00.000Z",
    },
    rankings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", example: "홍길동" },
          score: { type: "number", example: 91.25 },
          userId: { type: "string", example: "123" },
          drawingId: { type: "string", example: "456" },
          rank: { type: "integer", example: 1 },
          isMe: { type: "boolean", example: true },
        },
        required: ["name", "score", "userId", "drawingId", "rank", "isMe"],
      },
    },
  },
};

const myRankingSuccessResponseSchema = {
  type: "object",
  properties: {
    state: { type: "string", example: "FOUND" },
    ranking: {
      type: "object",
      properties: {
        rank: { type: "integer", example: 1 },
        score: { type: "number", example: 91.25 },
      },
      required: ["rank", "score"],
    },
  },
  required: ["state", "ranking"],
};

const myRankingNotSubmittedResponseSchema = {
  type: "object",
  properties: {
    state: { type: "string", example: "NOT_SUBMITTED" },
    message: { type: "string", example: "NOT_SUBMITTED" },
  },
  required: ["state", "message"],
};

const myRankingResponseSchema = {
  oneOf: [myRankingSuccessResponseSchema, myRankingNotSubmittedResponseSchema],
};

@ApiTags("Rankings")
@UseGuards(JwtAuthGuard)
@Controller("rankings")
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get("podium")
  @ApiOperation({
    summary: "TOP3 랭킹 조회",
    description:
      "시스템이 미리 계산해 저장한 랭킹 순서대로 상위 3개를 반환합니다.",
  })
  @ApiOkResponse({
    description: "상위 3개 랭킹 목록",
    schema: podiumResponseSchema,
  })
  async findPodium(): Promise<PodiumResponse> {
    return await this.rankingService.findPodium();
  }

  @Get("")
  @ApiHeader({
    name: "X-User-Id",
    required: false,
    description: "현재 사용자의 식별자. 전달하면 isMe가 계산됩니다.",
  })
  @ApiOperation({
    summary: "TOP100 랭킹 조회",
    description:
      "시스템이 미리 계산해 저장한 랭킹 순서대로 상위 100개를 반환합니다. X-User-Id를 전달하면 현재 사용자 항목의 isMe를 true로 표시합니다.",
  })
  @ApiOkResponse({
    description: "상위 100개 랭킹 목록",
    schema: rankingListResponseSchema,
  })
  @ApiBadRequestResponse({
    description: "X-User-Id 헤더가 숫자 문자열이 아닌 경우",
  })
  async findRankingList(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<RankingListResponse> {
    return await this.rankingService.findRankingList(user.userKey);
  }

  @Get("me")
  @ApiHeader({
    name: "X-User-Id",
    required: true,
    description: "현재 사용자의 식별자",
  })
  @ApiOperation({
    summary: "내 랭킹 조회",
    description:
      "오늘 제출한 drawing 중 가장 높은 순위의 개인 랭킹을 반환합니다. 오늘 제출이 없으면 NOT_SUBMITTED 상태와 내부 키를 반환합니다.",
  })
  @ApiOkResponse({
    description: "개인 랭킹 조회 결과",
    schema: myRankingResponseSchema,
  })
  @ApiBadRequestResponse({
    description: "X-User-Id 헤더가 없거나 숫자 문자열이 아닌 경우",
  })
  async findMyRanking(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<MyRankingResponse> {
    return await this.rankingService.findMyRanking(user.userKey);
  }
}
