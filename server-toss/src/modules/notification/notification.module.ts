import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import { PromptModule } from "../prompt/prompt.module";
import { DailyPromptNotificationScheduler } from "./daily-prompt-notification.scheduler";
import { RankingChangedListener } from "./listeners/ranking-changed.listener";
import { NotificationAgreement } from "./notification-agreement.entity";
import { NotificationAgreementService } from "./notification-agreement.service";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";
import { SentNotification } from "./sent-notification.entity";
import { SentNotificationStaleCleanupScheduler } from "./sent-notification-stale-cleanup.scheduler";

@Module({
  imports: [
    MikroOrmModule.forFeature([SentNotification, NotificationAgreement]),
    PromptModule,
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationAgreementService,
    DailyPromptNotificationScheduler,
    SentNotificationStaleCleanupScheduler,
    RankingChangedListener,
  ],
  exports: [NotificationService, NotificationAgreementService],
})
export class NotificationModule {}
