import { defineConfig } from "@mikro-orm/mysql";
import { User } from "./user/user.entity";
import { Drawing } from "./drawing/drawing.entity";
import { Prompt } from "./prompt/prompt.entity";

export default defineConfig({
  dbName: process.env.MYSQL_DATABASE ?? "daVinci_toss",
  host: process.env.MYSQL_HOST ?? "127.0.0.1",
  port: parseInt(process.env.MYSQL_PORT ?? "3306"),
  user: process.env.MYSQL_USER ?? "root",
  password: process.env.MYSQL_PASSWORD ?? "",
  entities: [User, Drawing, Prompt],
  debug: process.env.NODE_ENV !== "production",
});
