import "dotenv/config";
import { defineConfig } from "@mikro-orm/mysql";
import { User } from "./modules/user/user.entity";
import { Drawing } from "./modules/drawing/drawing.entity";
import { Prompt } from "./modules/prompt/prompt.entity";
import { DailyPrompt } from "./modules/prompt/daily-prompt.entity";
import { PointLog } from "./modules/point/point-log.entity";
import { AdView } from "./modules/ad/ad-view.entity";
import { Ranking } from "./modules/ranking/ranking.entity";
import { Migrator } from "@mikro-orm/migrations";

export default defineConfig({
  dbName: process.env.MYSQL_DATABASE ?? "daVinci_toss",
  host: process.env.MYSQL_HOST ?? "127.0.0.1",
  port: parseInt(process.env.MYSQL_PORT ?? "3306"),
  user: process.env.MYSQL_USER ?? "root",
  password: process.env.MYSQL_PASSWORD ?? "",
  entities: [User, Drawing, Prompt, DailyPrompt, PointLog, AdView, Ranking],
  debug: process.env.NODE_ENV !== "production",
  extensions: [Migrator],
  migrations: {
    snapshot: process.env.NODE_ENV !== "production",
    path: "dist/migrations",
    pathTs: "src/migrations",
  },
});
