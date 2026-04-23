import { Controller, Get, Headers } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { RankingService } from "./ranking.service";
import { parseUserIdHeader } from "./ranking.util";
import {
  type MyRankingResponse,
  type Top100RankingResponse,
  type Top3RankingResponse,
} from "./types/ranking.type";

const top3RankingResponseSchema = {
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

const top100RankingResponseSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      name: { type: "string", example: "홍길동" },
      score: { type: "number", example: 91.25 },
      userId: { type: "string", example: "123" },
      drawingId: { type: "string", example: "456" },
    },
    required: ["name", "score", "userId", "drawingId"],
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
@Controller("rankings")
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get("top3")
  @ApiOperation({
    summary: "TOP3 랭킹 조회",
    description:
      "시스템이 미리 계산해 저장한 랭킹 순서대로 상위 3개를 반환합니다.",
  })
  @ApiOkResponse({
    description: "상위 3개 랭킹 목록",
    schema: top3RankingResponseSchema,
  })
  async findTop3(): Promise<Top3RankingResponse> {
    return await this.rankingService.findTop3();
  }

  @Get("top100")
  @ApiOperation({
    summary: "TOP100 랭킹 조회",
    description:
      "시스템이 미리 계산해 저장한 랭킹 순서대로 상위 100개를 반환합니다. 상세 조회를 위해 식별자 정보를 포함합니다.",
  })
  @ApiOkResponse({
    description: "상위 100개 랭킹 목록",
    schema: top100RankingResponseSchema,
  })
  async findTop100(): Promise<Top100RankingResponse> {
    return await this.rankingService.findTop100();
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
    @Headers("x-user-id") userIdHeader?: string | string[],
  ): Promise<MyRankingResponse> {
    const userId = parseUserIdHeader(userIdHeader);

    return await this.rankingService.findMyRanking(userId);
  }
}
