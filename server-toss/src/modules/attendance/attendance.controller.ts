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
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { SchemaObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import type {
  AttendanceCheckInResponse,
  AttendanceRecoverRequest,
  AttendanceRecoverResponse,
  AttendanceStatusResponse,
} from "@toss/shared";
import { AttendanceRecoverRequestSchema } from "@toss/shared";
import { ZodValidationPipe } from "src/common/zod-validation.pipe";
import {
  CurrentUser,
  type CurrentUserPayload,
} from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AttendanceService } from "./attendance.service";

const AttendanceStatusSchema: SchemaObject = {
  type: "object",
  properties: {
    cycleDay: { type: "integer", minimum: 0 },
    checkedToday: { type: "boolean" },
    recoverable: { type: "boolean" },
    previousDay: { type: "integer", minimum: 0, nullable: true },
    tomorrowMaxPoint: { type: "integer", minimum: 0 },
    totalPoints: { type: "integer", minimum: 0 },
    todayPoints: { type: "integer", minimum: 0 },
  },
  required: [
    "cycleDay",
    "checkedToday",
    "recoverable",
    "previousDay",
    "tomorrowMaxPoint",
    "totalPoints",
    "todayPoints",
  ],
};

const AttendanceCheckInSchema: SchemaObject = {
  type: "object",
  properties: {
    status: {
      type: "string",
      enum: ["started", "continued", "already", "reset_recoverable"],
    },
    cycleDay: { type: "integer", minimum: 1 },
    recoverable: { type: "boolean" },
    previousDay: { type: "integer", minimum: 0, nullable: true },
    rewardedDay: { type: "integer", nullable: true },
  },
  required: ["status", "cycleDay", "recoverable", "previousDay", "rewardedDay"],
};

const AttendanceRecoverBodySchema: SchemaObject = {
  type: "object",
  properties: {
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
  required: ["sdkPayload"],
};

const AttendanceRecoverResponseSchema: SchemaObject = {
  type: "object",
  properties: {
    cycleDay: { type: "integer", minimum: 1 },
    rewardedDay: { type: "integer", nullable: true },
  },
  required: ["cycleDay", "rewardedDay"],
};

@ApiTags("Attendance")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("attendance")
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get("me")
  @ApiOperation({
    summary: "출석 현황 조회 (연속일·내일 최대 포인트·누적/오늘 포인트)",
  })
  @ApiOkResponse({ description: "출석 현황", schema: AttendanceStatusSchema })
  @ApiUnauthorizedResponse({ description: "인증이 필요해요." })
  getMyAttendance(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<AttendanceStatusResponse> {
    return this.attendanceService.getStatus(user.userKey);
  }

  @Post("check-in")
  @HttpCode(200)
  @ApiOperation({ summary: "오늘 출석 체크 (당일 1회 멱등)" })
  @ApiOkResponse({
    description: "체크인 결과",
    schema: AttendanceCheckInSchema,
  })
  @ApiUnauthorizedResponse({ description: "인증이 필요해요." })
  checkIn(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<AttendanceCheckInResponse> {
    return this.attendanceService.checkIn(user.userKey);
  }

  @Post("recover")
  @HttpCode(200)
  @ApiOperation({ summary: "보상형 광고 시청 후 끊긴 연속 출석 복구" })
  @ApiBody({
    description: "보상형 광고 시청(userEarnedReward) 페이로드",
    schema: AttendanceRecoverBodySchema,
  })
  @ApiOkResponse({
    description: "복구 결과",
    schema: AttendanceRecoverResponseSchema,
  })
  @ApiUnauthorizedResponse({ description: "인증이 필요해요." })
  @ApiForbiddenResponse({
    description: "등록되지 않은 광고이거나 복구할 연속 출석이 없어요.",
  })
  recover(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(AttendanceRecoverRequestSchema))
    body: AttendanceRecoverRequest,
  ): Promise<AttendanceRecoverResponse> {
    return this.attendanceService.recover(user.userKey, body.sdkPayload);
  }
}
