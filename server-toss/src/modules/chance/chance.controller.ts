import {
  Body,
  Controller,
  Get,
  HttpCode,
  Logger,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type {
  ChargeRequest,
  ChargeResponse,
  MyChanceResponse,
} from "@toss/shared";
import { ChargeRequestSchema } from "@toss/shared";
import { ZodValidationPipe } from "src/common/zod-validation.pipe";
import {
  CurrentUser,
  type CurrentUserPayload,
} from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { MissionService } from "../mission/service/mission.service";
import { ChanceService } from "./chance.service";
import type { SchemaObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";

const ChanceCountResponseSchema: SchemaObject = {
  type: "object",
  properties: { count: { type: "integer", minimum: 0 } },
  required: ["count"],
};

const ChargeResultResponseSchema: SchemaObject = {
  type: "object",
  properties: {
    count: { type: "integer", minimum: 0 },
    chanceGranted: {
      type: "boolean",
      description:
        "이번 요청으로 기회가 실제 지급됐는지. 공유는 일일 지급 한도 초과 시 기회 없이 미션만 진행돼 false가 될 수 있다.",
    },
  },
  required: ["count"],
};

const ChargeRequestBodySchema: SchemaObject = {
  oneOf: [
    {
      type: "object",
      properties: {
        source: { type: "string", enum: ["ad"] },
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
        source: { type: "string", enum: ["share"] },
        sdkPayload: {
          type: "object",
          properties: {
            channel: { type: "string", enum: ["contactsViral"] },
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
};

@ApiTags("Chance")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("chances")
export class ChanceController {
  private readonly logger = new Logger(ChanceController.name);

  constructor(
    private readonly chanceService: ChanceService,
    private readonly missionService: MissionService,
  ) {}

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
    schema: ChargeResultResponseSchema,
  })
  @ApiUnauthorizedResponse({ description: "인증이 필요해요." })
  @ApiForbiddenResponse({
    description: "화이트리스트에 없거나 일일 적립 한도를 넘었어요.",
  })
  async charge(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(ChargeRequestSchema)) body: ChargeRequest,
  ): Promise<ChargeResponse> {
    if (body.source === "ad") {
      return this.chanceService.chargeByAd(user.userKey, body.sdkPayload);
    }

    const result = await this.chanceService.chargeByShare(
      user.userKey,
      body.sdkPayload,
    );
    // 적립(기회) 트랜잭션이 커밋된 뒤 친구초대 미션을 진행시킨다. 미션 진행 실패가
    // 이미 지급된 기회를 되돌리지 않도록 best-effort로 분리한다(별도 트랜잭션).
    await this.progressInviteMission(user.userKey);
    return result;
  }

  private async progressInviteMission(userKey: number): Promise<void> {
    try {
      await this.missionService.onFriendInvited(userKey);
    } catch (err) {
      this.logger.warn(
        { event: "mission.invite.progress_failed", userKey, err },
        "친구초대 미션 진행 실패",
      );
    }
  }
}
