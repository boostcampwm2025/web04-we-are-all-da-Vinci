import { defineConfig } from "@mikro-orm/mysql";
import { User } from "./user/user.entity";

export default defineConfig({
  dbName: process.env.MYSQL_DATABASE ?? "test_db",
  host: process.env.MYSQL_HOST ?? "localhost",
  port: parseInt(process.env.MYSQL_PORT ?? "3306", 10),
  user: process.env.MYSQL_USER ?? "root",
  password: process.env.MYSQL_PASSWORD ?? "",
  entities: [User],
  debug: process.env.NODE_ENV === "production" ? false : true,
});
