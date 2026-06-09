import { Migrator } from "@mikro-orm/migrations";
import { defineConfig } from "@mikro-orm/mysql";
import { SeedManager } from "@mikro-orm/seeder";
import { AdView } from "./modules/chance/ad-view.entity";
import { PlayChance } from "./modules/chance/play-chance.entity";
import { ShareLog } from "./modules/chance/share-log.entity";
import { Drawing } from "./modules/drawing/drawing.entity";
import { NotificationAgreement } from "./modules/notification/notification-agreement.entity";
import { SentNotification } from "./modules/notification/sent-notification.entity";
import { PointGrantRequest } from "./modules/point/entity/point-grant-request.entity";
import { PointLog } from "./modules/point/entity/point-log.entity";
import { DailyPrompt } from "./modules/prompt/daily-prompt.entity";
import { Prompt } from "./modules/prompt/prompt.entity";
import { Ranking } from "./modules/ranking/ranking.entity";
import { User } from "./modules/user/user.entity";

export default defineConfig({
  dbName: process.env.MYSQL_DATABASE ?? "daVinci_toss",
  host: process.env.MYSQL_HOST ?? "127.0.0.1",
  port: parseInt(process.env.MYSQL_PORT ?? "3306"),
  user: process.env.MYSQL_USER ?? "root",
  password: process.env.MYSQL_PASSWORD ?? "",
  entities: [
    User,
    Drawing,
    Prompt,
    DailyPrompt,
    PointLog,
    PointGrantRequest,
    AdView,
    Ranking,
    PlayChance,
    ShareLog,
    SentNotification,
    NotificationAgreement,
  ],
  debug: process.env.NODE_ENV !== "production",
  forceUtcTimezone: true, // UTC로 시간 설정 고정
  allowGlobalContext: process.env.NODE_ENV === "test", // 테스트환경의 전역 em 사용을 위한 설정
  extensions: [Migrator, SeedManager],
  migrations: {
    snapshot: process.env.NODE_ENV !== "production",
    path: "dist/migrations",
    pathTs: "src/migrations",
    transactional: false,
    allOrNothing: false,
  },
  seeder: {
    path: "dist/seeders",
    pathTs: "src/seeders",
    emit: "ts",
    glob: "!(*.d).{js,ts}",
    fileName: (className: string) => className,
  },
});
