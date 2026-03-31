import { defineConfig } from "@mikro-orm/mysql";
import { User } from "./user/user.entity";
import { Drawing } from "./drawing/drawing.entity";
import { Prompt } from "./prompt/prompt.entity";
import { DailyPrompt } from "./prompt/daily-prompt.entity";
import { PointLog } from "./point/point-log.entity";
import { AdView } from "./ad/ad-view.entity";
import { Ranking } from "./ranking/ranking.entity";

export default defineConfig({
  dbName: process.env.MYSQL_DATABASE ?? "daVinci_toss",
  host: process.env.MYSQL_HOST ?? "127.0.0.1",
  port: parseInt(process.env.MYSQL_PORT ?? "3306"),
  user: process.env.MYSQL_USER ?? "root",
  password: process.env.MYSQL_PASSWORD ?? "",
  entities: [User, Drawing, Prompt, DailyPrompt, PointLog, AdView, Ranking],
  debug: process.env.NODE_ENV !== "production",
});
