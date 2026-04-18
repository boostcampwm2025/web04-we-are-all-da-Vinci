import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { RankingService } from "./ranking.service";
import {
  type Top100RankingResponse,
  type Top3RankingResponse,
} from "./types/ranking.type";

const top3RankingResponseSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      name: { type: "string", example: "홍길동" },
      similarity: { type: "number", example: 91.25 },
    },
    required: ["name", "similarity"],
  },
};

const top100RankingResponseSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      name: { type: "string", example: "홍길동" },
      similarity: { type: "number", example: 91.25 },
      userId: { type: "string", example: "123" },
      drawingId: { type: "string", example: "456" },
    },
    required: ["name", "similarity", "userId", "drawingId"],
  },
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
}
