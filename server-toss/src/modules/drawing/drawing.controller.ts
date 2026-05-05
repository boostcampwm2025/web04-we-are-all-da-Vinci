import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type {
  SimilarityResponse,
  SubmitDrawingRequest,
  SubmitDrawingResponse,
  SubmitStrokesRequest,
} from "@toss/shared";
import {
  SubmitDrawingRequestSchema,
  SubmitStrokesRequestSchema,
} from "@toss/shared";
import { getTodayKst } from "src/common/util/today";
import { ZodValidationPipe } from "src/common/zod-validation.pipe";
import { DrawingService } from "./service/drawing.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  CurrentUser,
  type CurrentUserPayload,
} from "../auth/decorators/current-user.decorator";

import { DrawingDetailDto } from "./dto/drawing.dto";

@ApiTags("Drawing")
@UseGuards(JwtAuthGuard)
@Controller()
export class DrawingController {
  constructor(private readonly drawingService: DrawingService) {}

  @Post("strokes")
  @ApiOperation({ summary: "실시간 유사도 계산 (DB 저장 없음)" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        strokes: {
          type: "array",
          items: {
            type: "object",
            required: ["points", "color"],
            properties: {
              points: {
                type: "array",
                items: { type: "array", items: { type: "number" } },
                minItems: 2,
                maxItems: 2,
              },
              color: {
                type: "array",
                items: { type: "integer", minimum: 0, maximum: 255 },
                minItems: 3,
                maxItems: 3,
              },
            },
          },
        },
      },
      required: ["strokes"],
    },
  })
  @ApiResponse({ status: 201, description: "유사도 결과 반환" })
  @ApiResponse({ status: 400, description: "Zod 검증 실패" })
  @ApiResponse({ status: 404, description: "오늘 프롬프트 없음" })
  async scoreStrokes(
    @Body(new ZodValidationPipe(SubmitStrokesRequestSchema))
    body: SubmitStrokesRequest,
  ): Promise<SimilarityResponse> {
    return this.drawingService.scoreStrokes(body.strokes, getTodayKst());
  }

  @Post("drawing")
  @ApiOperation({ summary: "최종 드로잉 제출 (유사도 재계산 후 DB 저장)" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        userKey: { type: "string", minLength: 1 },
        strokes: {
          type: "array",
          items: {
            type: "object",
            required: ["points", "color"],
            properties: {
              points: {
                type: "array",
                items: { type: "array", items: { type: "number" } },
                minItems: 2,
                maxItems: 2,
              },
              color: {
                type: "array",
                items: { type: "integer", minimum: 0, maximum: 255 },
                minItems: 3,
                maxItems: 3,
              },
            },
          },
        },
      },
      required: ["userKey", "strokes"],
    },
  })
  @ApiResponse({ status: 201, description: "{ drawingId, similarity } 반환" })
  @ApiResponse({ status: 400, description: "Zod 검증 실패" })
  @ApiResponse({ status: 404, description: "사용자 또는 프롬프트 없음" })
  async submitDrawing(
    @Body(new ZodValidationPipe(SubmitDrawingRequestSchema))
    body: SubmitDrawingRequest,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<SubmitDrawingResponse> {
    return this.drawingService.submitDrawing(
      user.userKey,
      body.strokes,
      getTodayKst(),
    );
  }

  @Get("drawing/me")
  getMyDrawings(@CurrentUser() user: CurrentUserPayload) {
    return this.drawingService.getMyDrawings(user.userKey);
  }

  @Get("drawing/:drawingId")
  getDrawing(@Param() { drawingId }: DrawingDetailDto) {
    return this.drawingService.getDrawing(drawingId);
  }
}
