import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import {
  NotificationAgreementRequestSchema,
  type NotificationAgreementRequest,
  type NotificationAgreementResponse,
} from "@toss/shared";
import { ZodValidationPipe } from "src/common/zod-validation.pipe";
import type { CurrentUserPayload } from "src/modules/auth/decorators/current-user.decorator";
import { CurrentUser } from "src/modules/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "src/modules/auth/guards/jwt-auth.guard";
import { NotificationAgreementService } from "./notification-agreement.service";

// NotificationAgreementRequestSchema(Zod)를 JSON Schema로 수동 기술. Zod→OpenAPI 자동 변환은 쓰지 않는다.
const agreementRequestBody = {
  schema: {
    type: "object",
    required: ["eventType"],
    properties: {
      eventType: {
        type: "string",
        enum: ["newAgreement", "alreadyAgreed", "agreementRejected"],
      },
    },
  },
} satisfies Parameters<typeof ApiBody>[0];

@ApiTags("notifications")
@Controller("notifications")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(
    private readonly notificationAgreementService: NotificationAgreementService,
  ) {}

  @Get("daily-prompt/agreement")
  @ApiOperation({
    summary: "매일 제시 그림 알림 동의 상태 조회",
    description:
      "JWT로 인증된 사용자의 매일 제시 그림 알림 동의 상태를 반환해요.",
  })
  @ApiResponse({ status: 200, description: "동의 상태 반환" })
  getDailyPromptAgreement(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<NotificationAgreementResponse> {
    return this.notificationAgreementService.getDailyPromptAgreement(
      user.userKey,
    );
  }

  @Post("daily-prompt/agreement")
  @ApiOperation({
    summary: "매일 제시 그림 알림 동의 결과 저장",
    description:
      "앱인토스 requestNotificationAgreement SDK의 이벤트 결과를 저장해요.",
  })
  @ApiBody(agreementRequestBody)
  @ApiResponse({ status: 201, description: "동의 결과 저장 성공" })
  @ApiResponse({ status: 400, description: "Zod 검증 실패" })
  saveDailyPromptAgreement(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(NotificationAgreementRequestSchema))
    body: NotificationAgreementRequest,
  ): Promise<NotificationAgreementResponse> {
    return this.notificationAgreementService.saveDailyPromptAgreement({
      userKey: user.userKey,
      eventType: body.eventType,
    });
  }

  @Get("overtaken/agreement")
  @ApiOperation({
    summary: "랭킹 추월 알림 동의 상태 조회",
    description: "JWT로 인증된 사용자의 랭킹 추월 알림 동의 상태를 반환해요.",
  })
  @ApiResponse({ status: 200, description: "동의 상태 반환" })
  getOvertakenAgreement(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<NotificationAgreementResponse> {
    return this.notificationAgreementService.getOvertakenAgreement(
      user.userKey,
    );
  }

  @Post("overtaken/agreement")
  @ApiOperation({
    summary: "랭킹 추월 알림 동의 결과 저장",
    description:
      "앱인토스 requestNotificationAgreement SDK의 이벤트 결과를 저장해요.",
  })
  @ApiBody(agreementRequestBody)
  @ApiResponse({ status: 201, description: "동의 결과 저장 성공" })
  @ApiResponse({ status: 400, description: "Zod 검증 실패" })
  saveOvertakenAgreement(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(NotificationAgreementRequestSchema))
    body: NotificationAgreementRequest,
  ): Promise<NotificationAgreementResponse> {
    return this.notificationAgreementService.saveOvertakenAgreement({
      userKey: user.userKey,
      eventType: body.eventType,
    });
  }
}
