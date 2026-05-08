import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
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

@ApiTags("Chance")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("chances")
export class ChanceController {
  constructor(private readonly chanceService: ChanceService) {}

  @Get("me")
  @ApiOperation({ summary: "현재 그리기 기회 조회" })
  getMyChance(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<MyChanceResponse> {
    return this.chanceService.getMyChance(user.userKey);
  }

  @Post("charge")
  @HttpCode(200)
  @ApiOperation({ summary: "그리기 기회 적립 (광고/공유)" })
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
  consume(@CurrentUser() user: CurrentUserPayload): Promise<ConsumeResponse> {
    return this.chanceService.consume(user.userKey);
  }
}
