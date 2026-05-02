import { Migrator } from "@mikro-orm/migrations";
import { defineConfig } from "@mikro-orm/mysql";
import { SeedManager } from "@mikro-orm/seeder";
import "dotenv/config";
import { AdView } from "./modules/ad/ad-view.entity";
import { Drawing } from "./modules/drawing/drawing.entity";
import { PointLog } from "./modules/point/point-log.entity";
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
  entities: [User, Drawing, Prompt, DailyPrompt, PointLog, AdView, Ranking],
  debug: process.env.NODE_ENV !== "production",
  forceUtcTimezone: true, // UTC로 시간 설정 고정
  allowGlobalContext: process.env.NODE_ENV === "test", // 테스트환경의 전역 em 사용을 위한 설정
  extensions: [Migrator, SeedManager],
  migrations: {
    snapshot: process.env.NODE_ENV !== "production",
    path: "dist/migrations",
    pathTs: "src/migrations",
  },
  seeder: {
    path: "dist/seeders",
    pathTs: "src/seeders",
  },
});
