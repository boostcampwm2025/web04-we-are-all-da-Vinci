import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type {
  ChargeRequest,
  ChargeResponse,
  ConsumeResponse,
  MyChanceResponse,
} from "@toss/shared";
import { ChargeRequestSchema } from "@toss/shared";
import { ZodValidationPipe } from "src/common/zod-validation.pipe";
import {
  CurrentUser,
  type CurrentUserPayload,
} from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ChanceService } from "./chance.service";

const ChanceCountResponseSchema = {
  type: "object",
  properties: { count: { type: "integer", minimum: 0 } },
  required: ["count"],
} as const;

const ChargeRequestBodySchema = {
  oneOf: [
    {
      type: "object",
      properties: {
        source: { const: "ad" },
        sdkPayload: {
          type: "object",
          properties: {
            adGroupId: { type: "string", minLength: 1 },
            unitType: { type: "string" },
            unitAmount: { type: "integer", minimum: 0 },
          },
          required: ["adGroupId"],
        },
      },
      required: ["source", "sdkPayload"],
    },
    {
      type: "object",
      properties: {
        source: { const: "share" },
        sdkPayload: {
          type: "object",
          properties: {
            channel: { const: "contactsViral" },
            moduleId: { type: "string", minLength: 1 },
            rewardAmount: { type: "integer", minimum: 0 },
            rewardUnit: { type: "string" },
          },
          required: ["channel", "moduleId"],
        },
      },
      required: ["source", "sdkPayload"],
    },
  ],
} as const;

@ApiTags("Chance")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("chances")
export class ChanceController {
  constructor(private readonly chanceService: ChanceService) {}

  @Get("me")
  @ApiOperation({ summary: "현재 그리기 기회 조회" })
  @ApiOkResponse({
    description: "현재 사용자의 그리기 기회 수",
    schema: ChanceCountResponseSchema,
  })
  @ApiUnauthorizedResponse({ description: "인증이 필요해요." })
  getMyChance(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<MyChanceResponse> {
    return this.chanceService.getMyChance(user.userKey);
  }

  @Post("charge")
  @HttpCode(200)
  @ApiOperation({ summary: "그리기 기회 적립 (광고/공유)" })
  @ApiBody({
    description: "광고(ad) 또는 친구 공유(share) 적립 요청",
    schema: ChargeRequestBodySchema,
  })
  @ApiOkResponse({
    description: "적립 후 잔여 그리기 기회",
    schema: ChanceCountResponseSchema,
  })
  @ApiUnauthorizedResponse({ description: "인증이 필요해요." })
  @ApiForbiddenResponse({
    description: "화이트리스트에 없거나 일일 적립 한도를 넘었어요.",
  })
  @ApiServiceUnavailableResponse({
    description: "운영자 화이트리스트 환경변수가 누락됐어요.",
  })
  charge(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(ChargeRequestSchema)) body: ChargeRequest,
  ): Promise<ChargeResponse> {
    if (body.source === "ad") {
      return this.chanceService.chargeByAd(user.userKey, body.sdkPayload);
    }
    return this.chanceService.chargeByShare(user.userKey, body.sdkPayload);
  }

  @Post("consume")
  @HttpCode(200)
  @ApiOperation({ summary: "그리기 시작 시 기회 1회 차감" })
  @ApiOkResponse({
    description: "차감 후 잔여 그리기 기회",
    schema: ChanceCountResponseSchema,
  })
  @ApiUnauthorizedResponse({ description: "인증이 필요해요." })
  @ApiConflictResponse({ description: "그리기 기회가 부족해요." })
  consume(@CurrentUser() user: CurrentUserPayload): Promise<ConsumeResponse> {
    return this.chanceService.consume(user.userKey);
  }
}
