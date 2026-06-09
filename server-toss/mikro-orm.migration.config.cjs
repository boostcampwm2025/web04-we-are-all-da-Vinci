require("dotenv/config");

const { User } = require("./dist/modules/user/user.entity");
const { Drawing } = require("./dist/modules/drawing/drawing.entity");
const { Prompt } = require("./dist/modules/prompt/prompt.entity");
const { DailyPrompt } = require("./dist/modules/prompt/daily-prompt.entity");
const { PointLog } = require("./dist/modules/point/entity/point-log.entity");
const { AdView } = require("./dist/modules/chance/ad-view.entity");
const { Ranking } = require("./dist/modules/ranking/ranking.entity");
const { PlayChance } = require("./dist/modules/chance/play-chance.entity");
const { ShareLog } = require("./dist/modules/chance/share-log.entity");
const {
  SentNotification,
} = require("./dist/modules/notification/sent-notification.entity");
const {
  NotificationAgreement,
} = require("./dist/modules/notification/notification-agreement.entity");
const {
  PointGrantRequest,
} = require("./dist/modules/point/entity/point-grant-request.entity");

const { Migrator } = require("@mikro-orm/migrations");
const { SeedManager } = require("@mikro-orm/seeder");
const { defineConfig } = require("@mikro-orm/mysql");

module.exports = defineConfig({
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
    AdView,
    Ranking,
    PlayChance,
    ShareLog,
    SentNotification,
    NotificationAgreement,
    PointGrantRequest,
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
    fileName: (className) => className,
  },
});
